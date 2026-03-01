/**
 * 既存レシピの cooking_time_minutes をバックフィルするスクリプト
 *
 * cooking_time_minutes が NULL のレシピを再スクレイプして更新する。
 * HTML 直接取得 → JSON-LD / __NEXT_DATA__ で調理時間を抽出。
 * HTML 取得に失敗したレシピはスキップ（サイト側ブロック等）。
 *
 * 使い方:
 *   # ローカル環境（デフォルト）
 *   npx tsx scripts/backfill-cooking-time.ts
 *
 *   # ステージング環境
 *   npx tsx scripts/backfill-cooking-time.ts --env=staging
 *
 *   # 確認のみ（DBを更新しない）
 *   npx tsx scripts/backfill-cooking-time.ts --env=staging --dry-run
 *
 *   # 処理件数を制限
 *   npx tsx scripts/backfill-cooking-time.ts --env=staging --limit=10
 */

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { fetchHtml, HtmlFetchError } from '../src/lib/scraper/html-fetcher'
import { extractRecipeFromJsonLd } from '../src/lib/scraper/json-ld-extractor'
import { extractRecipeFromNextData } from '../src/lib/scraper/next-data-extractor'

// ----- 引数解析 -----
const args = process.argv.slice(2)
const envArg = args.find((a) => a.startsWith('--env='))
const envName = envArg ? envArg.split('=')[1] : 'local'
const envFilePath = `.env.${envName}`
const dryRun = args.includes('--dry-run')
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

if (!existsSync(envFilePath)) {
  console.error(`エラー: ${envFilePath} が見つかりません`)
  process.exit(1)
}

// 環境変数ファイルを読み込み
const envFile = readFileSync(envFilePath, 'utf-8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match && match[1] && !process.env[match[1]]) {
    process.env[match[1]] = match[2]
  }
}

// ----- 設定 -----
const BATCH_SIZE = 20
const DELAY_MS = 1500

// ----- Supabase クライアント（env 読み込み後に初期化） -----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

interface RecipeRow {
  id: string
  url: string
  title: string
}

async function getRecipesWithoutCookingTime(fetchLimit: number): Promise<RecipeRow[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, url, title')
    .is('cooking_time_minutes', null)
    .limit(fetchLimit)
  if (error) throw error
  return (data ?? []) as RecipeRow[]
}

async function countTarget(): Promise<number> {
  const { count, error } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
    .is('cooking_time_minutes', null)
  if (error) throw error
  return count ?? 0
}

async function updateCookingTime(id: string, minutes: number): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ cooking_time_minutes: minutes })
    .eq('id', id)
  if (error) throw error
}

/** HTML 取得 → JSON-LD / __NEXT_DATA__ で cookingTimeMinutes を抽出 */
async function extractCookingTime(url: string): Promise<number | null> {
  const { html } = await fetchHtml(url)

  const jsonLd = extractRecipeFromJsonLd(html, url)
  if (jsonLd?.cookingTimeMinutes != null) return jsonLd.cookingTimeMinutes

  const nextData = extractRecipeFromNextData(html)
  if (nextData?.cookingTimeMinutes != null) return nextData.cookingTimeMinutes

  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('=== cooking_time_minutes バックフィル ===')
  console.log(`環境: ${envName} (${envFilePath})`)
  if (dryRun) console.log('モード: dry-run（DBは更新しません）')
  console.log('')

  const totalTarget = await countTarget()
  console.log(`対象レシピ（cooking_time_minutes が NULL）: ${totalTarget} 件`)
  if (totalTarget === 0) {
    console.log('処理対象がありません。')
    return
  }

  const processLimit = isFinite(limit) ? Math.min(totalTarget, limit) : totalTarget
  console.log(`処理件数: ${processLimit} 件\n`)

  let processed = 0
  let updated = 0
  let skippedNoTime = 0
  let skippedError = 0
  let batchNum = 0

  while (processed < processLimit) {
    batchNum++
    const remaining = processLimit - processed
    const fetchCount = Math.min(BATCH_SIZE, remaining)
    const recipes = await getRecipesWithoutCookingTime(fetchCount)
    if (recipes.length === 0) break

    console.log(`--- バッチ ${batchNum}: ${recipes.length} 件 ---`)

    for (const recipe of recipes) {
      processed++
      const label = `[${processed}/${processLimit}] ${recipe.title}`
      try {
        const minutes = await extractCookingTime(recipe.url)
        if (minutes != null) {
          if (!dryRun) {
            await updateCookingTime(recipe.id, minutes)
          }
          console.log(`  ✅ ${label} → ${minutes}分${dryRun ? ' (dry-run)' : ''}`)
          updated++
        } else {
          console.log(`  ⏭️  ${label} → 調理時間なし（スキップ）`)
          skippedNoTime++
        }
      } catch (err) {
        const msg =
          err instanceof HtmlFetchError
            ? `HTML取得失敗 (${err.statusCode ?? 'timeout'})`
            : err instanceof Error
              ? err.message
              : String(err)
        console.log(`  ❌ ${label} → ${msg}`)
        skippedError++
      }

      if (processed < processLimit) {
        await sleep(DELAY_MS)
      }
    }
    console.log('')
  }

  console.log('=== 完了 ===')
  console.log(`処理: ${processed} 件`)
  console.log(`更新: ${updated} 件${dryRun ? ' (dry-run のため実際には未更新)' : ''}`)
  console.log(`スキップ（調理時間なし）: ${skippedNoTime} 件`)
  console.log(`スキップ（取得エラー）: ${skippedError} 件`)
}

main().catch((err) => {
  console.error('エラー:', err)
  process.exit(1)
})
