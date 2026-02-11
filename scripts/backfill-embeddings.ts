/**
 * 既存レシピの埋め込みベクトルをバックフィルするスクリプト
 *
 * 使い方:
 *   # ローカル環境（デフォルト）
 *   npx tsx scripts/backfill-embeddings.ts
 *
 *   # ステージング環境
 *   npx tsx scripts/backfill-embeddings.ts --env=staging
 *
 * 環境変数ファイル:
 *   --env=local    → .env.local（デフォルト）
 *   --env=staging  → .env.staging
 *
 * リトライ制限:
 *   - embedding_retry_count が MAX_RETRY_COUNT 未満のレシピのみ処理
 *   - 失敗時はリトライ回数をインクリメント
 *
 * 注意:
 *   - Gemini Embedding API の無料枠は 1000 RPD
 *   - バッチ間に待機時間を設けてレート制限を回避
 */

import { readFileSync, existsSync } from 'fs'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { google } from '@ai-sdk/google'
import { embedMany } from 'ai'

// 環境引数を解析
const envArg = process.argv.find((arg) => arg.startsWith('--env='))
const envName = envArg ? envArg.split('=')[1] : 'local'
const envFilePath = `.env.${envName}`

if (!existsSync(envFilePath)) {
  console.error(`エラー: ${envFilePath} が見つかりません`)
  process.exit(1)
}

console.log(`環境: ${envName} (${envFilePath})\n`)

// 環境変数ファイルを読み込み
const envFile = readFileSync(envFilePath, 'utf-8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    process.env[match[1]] = match[2]
  }
}

// 設定
const BATCH_SIZE = 50 // 一度に処理するレシピ数
const WAIT_MS = 2000 // バッチ間の待機時間 (ms)
const MAX_RETRY_COUNT = 3 // リトライ上限

// Supabase クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Gemini Embedding モデル
const embeddingModel = google.embeddingModel('gemini-embedding-001')

interface Recipe {
  id: string
  title: string
  embedding_retry_count: number
}

async function getRecipesWithoutEmbedding(limit: number): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, embedding_retry_count')
    .is('title_embedding', null)
    .lt('embedding_retry_count', MAX_RETRY_COUNT)
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Recipe[]
}

async function countRemainingRecipes(): Promise<number> {
  const { count, error } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
    .is('title_embedding', null)
    .lt('embedding_retry_count', MAX_RETRY_COUNT)

  if (error) throw error
  return count ?? 0
}

async function saveEmbedding(recipeId: string, embedding: number[]) {
  const { error } = await supabase
    .from('recipes')
    .update({
      title_embedding: JSON.stringify(embedding),
      embedding_generated_at: new Date().toISOString(),
      embedding_retry_count: 0, // 成功したらリセット
    })
    .eq('id', recipeId)

  if (error) throw error
}

async function incrementRetryCount(
  client: SupabaseClient,
  recipeId: string,
  currentCount: number
): Promise<void> {
  const { error } = await client
    .from('recipes')
    .update({ embedding_retry_count: currentCount + 1 })
    .eq('id', recipeId)

  if (error) {
    console.error(`  Failed to increment retry count for ${recipeId}:`, error)
  }
}

async function processBatch(recipes: Recipe[]) {
  if (recipes.length === 0) return { succeeded: 0, failed: 0, skipped: 0 }

  let embeddings: number[][]
  try {
    // 一括で埋め込み生成
    const result = await embedMany({
      model: embeddingModel,
      values: recipes.map((r) => r.title || ' '), // 空文字対策
    })
    embeddings = result.embeddings
  } catch (apiError) {
    // API 全体が失敗した場合、全レシピのリトライ回数をインクリメント
    console.error('  Embedding API failed:', apiError)
    for (const recipe of recipes) {
      await incrementRetryCount(supabase, recipe.id, recipe.embedding_retry_count)
    }
    return { succeeded: 0, failed: recipes.length, skipped: 0 }
  }

  let succeeded = 0
  let failed = 0

  // 各レシピに保存
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i]
    try {
      await saveEmbedding(recipe.id, embeddings[i])
      succeeded++
    } catch (err) {
      console.error(`  Failed to save embedding for ${recipe.id}:`, err)
      await incrementRetryCount(supabase, recipe.id, recipe.embedding_retry_count)
      failed++
    }
  }

  return { succeeded, failed, skipped: 0 }
}

async function main() {
  console.log('=== 埋め込みバックフィル開始 ===\n')

  const totalRemaining = await countRemainingRecipes()
  console.log(`未処理レシピ: ${totalRemaining} 件（リトライ上限未満）\n`)

  if (totalRemaining === 0) {
    console.log('処理対象のレシピがありません。')
    return
  }

  let processed = 0
  let totalSucceeded = 0
  let totalFailed = 0
  let batchNumber = 0

  while (true) {
    batchNumber++
    const recipes = await getRecipesWithoutEmbedding(BATCH_SIZE)

    if (recipes.length === 0) {
      break
    }

    console.log(`バッチ ${batchNumber}: ${recipes.length} 件処理中...`)

    const { succeeded, failed } = await processBatch(recipes)
    processed += recipes.length
    totalSucceeded += succeeded
    totalFailed += failed

    console.log(`  成功: ${succeeded}, 失敗: ${failed}`)
    console.log(`  進捗: ${processed}/${totalRemaining} (${Math.round((processed / totalRemaining) * 100)}%)\n`)

    // レート制限回避のため待機
    if (recipes.length === BATCH_SIZE) {
      console.log(`  ${WAIT_MS / 1000}秒待機中...\n`)
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS))
    }
  }

  console.log('=== バックフィル完了 ===')
  console.log(`合計処理: ${processed} 件`)
  console.log(`成功: ${totalSucceeded} 件`)
  console.log(`失敗: ${totalFailed} 件`)

  if (totalFailed > 0) {
    console.log(`\n※ 失敗したレシピはリトライ回数がインクリメントされました。`)
    console.log(`  ${MAX_RETRY_COUNT}回失敗すると処理対象から除外されます。`)
  }
}

main().catch((err) => {
  console.error('バックフィルエラー:', err)
  process.exit(1)
})
