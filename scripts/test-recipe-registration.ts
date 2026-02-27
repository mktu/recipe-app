/**
 * レシピ登録テストスクリプト
 *
 * 使用方法:
 *   # 単発実行
 *   npx tsx scripts/test-recipe-registration.ts <レシピURL>
 *
 *   # 一括実行（URLリストファイルから）
 *   npx tsx scripts/test-recipe-registration.ts
 *
 * オプション:
 *   --dry-run   パースのみ実行（登録しない）
 *   --limit=N   処理件数を制限
 *   --delay=N   リクエスト間隔（ミリ秒、デフォルト: 1000）
 *
 * 前提条件:
 *   - 開発サーバーが起動していること (npm run dev)
 *   - ローカル Supabase が起動していること (supabase start)
 *   - 開発用ユーザー (dev-user-001) がシードされていること
 */

import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const LINE_USER_ID = process.env.LINE_USER_ID || 'dev-user-001'
const URL_LIST_FILE = path.join(__dirname, '../seed/test-recipe-urls.txt')

interface ParsedRecipe {
  title: string
  sourceName: string
  imageUrl: string
  ingredientIds: string[]
  memo: string
  cookingTimeMinutes?: number | null
}

interface Recipe {
  id: string
  title: string
  url: string
  source_name: string | null
  image_url: string | null
  created_at: string
}

interface Result {
  url: string
  status: 'success' | 'skipped' | 'failed'
  title?: string
  error?: string
}

// オプション解析
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    url: null as string | null,
    dryRun: false,
    limit: Infinity,
    delay: 1000,
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--delay=')) {
      options.delay = parseInt(arg.split('=')[1], 10)
    } else if (!arg.startsWith('--')) {
      options.url = arg
    }
  }

  return options
}

// URLリストファイルを読み込み
function loadUrlList(): string[] {
  if (!fs.existsSync(URL_LIST_FILE)) {
    console.error(`❌ URLリストファイルが見つかりません: ${URL_LIST_FILE}`)
    console.error('   先に npm run collect:urls を実行してください')
    process.exit(1)
  }

  const content = fs.readFileSync(URL_LIST_FILE, 'utf-8')
  const urls = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .filter((line) => {
      try {
        new URL(line)
        return true
      } catch {
        return false
      }
    })

  return urls
}

async function parseRecipe(url: string, verbose = true): Promise<ParsedRecipe> {
  if (verbose) {
    console.log('   パース中...')
  }

  const response = await fetch(`${BASE_URL}/api/recipes/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`パース失敗: ${error.error || response.statusText}`)
  }

  const parsed = (await response.json()) as ParsedRecipe

  if (verbose) {
    console.log(`   タイトル: ${parsed.title}`)
    console.log(`   食材数: ${parsed.ingredientIds.length}件`)
  }

  return parsed
}

async function registerRecipe(
  url: string,
  parsed: ParsedRecipe,
  verbose = true
): Promise<{ recipe?: Recipe; skipped?: boolean }> {
  if (verbose) {
    console.log('   登録中...')
  }

  const response = await fetch(`${BASE_URL}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lineUserId: LINE_USER_ID,
      url,
      title: parsed.title,
      sourceName: parsed.sourceName,
      imageUrl: parsed.imageUrl,
      ingredientIds: parsed.ingredientIds,
      memo: parsed.memo,
      cookingTimeMinutes: parsed.cookingTimeMinutes ?? null,
    }),
  })

  if (response.status === 409) {
    // 重複URL
    return { skipped: true }
  }

  if (!response.ok) {
    const text = await response.text()
    let errorMessage = `[${response.status}] ${response.statusText}`
    try {
      const error = JSON.parse(text)
      errorMessage = error.error || error.message || errorMessage
    } catch {
      if (text) errorMessage = text
    }
    throw new Error(`登録失敗: ${errorMessage}`)
  }

  const recipe = (await response.json()) as Recipe
  return { recipe }
}

async function processSingleUrl(url: string, dryRun: boolean): Promise<Result> {
  try {
    const parsed = await parseRecipe(url)

    if (dryRun) {
      console.log('   (dry-run: 登録スキップ)')
      return { url, status: 'success', title: parsed.title }
    }

    const { recipe, skipped } = await registerRecipe(url, parsed)

    if (skipped) {
      console.log('   ⏭️  既に登録済み')
      return { url, status: 'skipped', title: parsed.title }
    }

    console.log(`   ✅ 登録完了 (ID: ${recipe!.id})`)
    return { url, status: 'success', title: recipe!.title }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`   ❌ ${message}`)
    return { url, status: 'failed', error: message }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runBatch(options: ReturnType<typeof parseArgs>) {
  const urls = loadUrlList()
  const targetUrls = urls.slice(0, options.limit)

  console.log('🧪 レシピ登録一括テスト')
  console.log('========================')
  console.log(`サーバー: ${BASE_URL}`)
  console.log(`ユーザー: ${LINE_USER_ID}`)
  console.log(`対象件数: ${targetUrls.length}件`)
  if (options.dryRun) {
    console.log('モード: dry-run（パースのみ）')
  }
  console.log('')

  const results: Result[] = []

  for (let i = 0; i < targetUrls.length; i++) {
    const url = targetUrls[i]
    console.log(`[${i + 1}/${targetUrls.length}] ${url}`)

    const result = await processSingleUrl(url, options.dryRun)
    results.push(result)

    // レート制限対策
    if (i < targetUrls.length - 1) {
      await sleep(options.delay)
    }
  }

  // レポート出力
  printReport(results)
}

function printReport(results: Result[]) {
  const success = results.filter((r) => r.status === 'success')
  const skipped = results.filter((r) => r.status === 'skipped')
  const failed = results.filter((r) => r.status === 'failed')

  console.log('\n========================================')
  console.log('📊 実行結果レポート')
  console.log('========================================')
  console.log(`✅ 成功: ${success.length}件`)
  console.log(`⏭️  スキップ（登録済み）: ${skipped.length}件`)
  console.log(`❌ 失敗: ${failed.length}件`)
  console.log(`合計: ${results.length}件`)

  if (failed.length > 0) {
    console.log('\n--- 失敗したURL ---')
    for (const r of failed) {
      console.log(`  ${r.url}`)
      console.log(`    理由: ${r.error}`)
    }
  }
}

async function runSingle(url: string, dryRun: boolean) {
  // URL 検証
  try {
    new URL(url)
  } catch {
    console.error(`❌ 無効なURL形式です: ${url}`)
    process.exit(1)
  }

  console.log('🧪 レシピ登録テスト')
  console.log('==================')
  console.log(`サーバー: ${BASE_URL}`)
  console.log(`ユーザー: ${LINE_USER_ID}`)
  console.log(`URL: ${url}`)
  if (dryRun) {
    console.log('モード: dry-run（パースのみ）')
  }
  console.log('')

  const result = await processSingleUrl(url, dryRun)

  if (result.status === 'success') {
    console.log(`\n✨ 完了: 「${result.title}」`)
  } else if (result.status === 'skipped') {
    console.log(`\n⏭️  スキップ: 「${result.title}」は既に登録済み`)
  } else {
    console.error(`\n❌ 失敗: ${result.error}`)
    process.exit(1)
  }
}

async function main() {
  const options = parseArgs()

  if (options.url) {
    // 単発実行
    await runSingle(options.url, options.dryRun)
  } else {
    // 一括実行
    await runBatch(options)
  }
}

main().catch((error) => {
  console.error('予期しないエラー:', error)
  process.exit(1)
})
