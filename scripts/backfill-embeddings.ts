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
 * 注意:
 *   - Gemini Embedding API の無料枠は 1000 RPD
 *   - バッチ間に待機時間を設けてレート制限を回避
 */

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
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

// Supabase クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Gemini Embedding モデル
const embeddingModel = google.embeddingModel('gemini-embedding-001')

async function getRecipesWithoutEmbedding(limit: number) {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title')
    .is('title_embedding', null)
    .limit(limit)

  if (error) throw error
  return data ?? []
}

async function countRemainingRecipes(): Promise<number> {
  const { count, error } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
    .is('title_embedding', null)

  if (error) throw error
  return count ?? 0
}

async function saveEmbedding(recipeId: string, embedding: number[]) {
  const { error } = await supabase
    .from('recipes')
    .update({
      title_embedding: JSON.stringify(embedding),
      embedding_generated_at: new Date().toISOString(),
    })
    .eq('id', recipeId)

  if (error) throw error
}

async function processBatch(recipes: { id: string; title: string }[]) {
  if (recipes.length === 0) return { succeeded: 0, failed: 0 }

  // 一括で埋め込み生成
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: recipes.map((r) => r.title),
  })

  let succeeded = 0
  let failed = 0

  // 各レシピに保存
  for (let i = 0; i < recipes.length; i++) {
    try {
      await saveEmbedding(recipes[i].id, embeddings[i])
      succeeded++
    } catch (err) {
      console.error(`  Failed to save embedding for ${recipes[i].id}:`, err)
      failed++
    }
  }

  return { succeeded, failed }
}

async function main() {
  console.log('=== 埋め込みバックフィル開始 ===\n')

  const totalRemaining = await countRemainingRecipes()
  console.log(`未処理レシピ: ${totalRemaining} 件\n`)

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
}

main().catch((err) => {
  console.error('バックフィルエラー:', err)
  process.exit(1)
})
