/**
 * 食材エイリアス自動生成スクリプト
 *
 * 未マッチ食材をLLMで判定し、エイリアス登録または新規食材追加を行う
 * ADR-001: 食材マッチングの表記揺れ対応
 *
 * 使い方:
 *   # ローカル環境（デフォルト）
 *   npx tsx scripts/auto-alias.ts
 *
 *   # ステージング環境
 *   npx tsx scripts/auto-alias.ts --env=staging
 *
 *   # ドライラン（実際には登録しない）
 *   npx tsx scripts/auto-alias.ts --dry-run
 *
 *   # 処理件数を指定
 *   npx tsx scripts/auto-alias.ts --limit=10
 *
 * 環境変数ファイル:
 *   --env=local    → .env.local（デフォルト）
 *   --env=staging  → .env.staging
 */

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

// ===========================================
// 引数解析
// ===========================================

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    env: 'local',
    dryRun: false,
    limit: 100,
  }

  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10)
    }
  }

  return options
}

// ===========================================
// 環境変数読み込み
// ===========================================

function loadEnvFile(envName: string): void {
  const envFilePath = `.env.${envName}`

  if (!existsSync(envFilePath)) {
    console.error(`エラー: ${envFilePath} が見つかりません`)
    process.exit(1)
  }

  console.log(`環境: ${envName} (${envFilePath})\n`)

  const envFile = readFileSync(envFilePath, 'utf-8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1]] = match[2]
    }
  }
}

// ===========================================
// メイン処理
// ===========================================

async function main() {
  const options = parseArgs()
  loadEnvFile(options.env)

  // 環境変数読み込み後に動的インポート
  const { generateAliases } = await import('../src/lib/batch/alias-generator')

  // Supabase クライアント
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  console.log('=== 食材エイリアス自動生成 ===\n')

  if (options.dryRun) {
    console.log('モード: ドライラン（実際には登録しない）\n')
  }

  console.log(`処理上限: ${options.limit} 件\n`)

  // 実行
  const result = await generateAliases(supabase, {
    limit: options.limit,
    dryRun: options.dryRun,
  })

  // 結果表示
  console.log('\n=== 結果 ===')
  console.log(`処理件数: ${result.processed}`)
  console.log(`エイリアス登録: ${result.aliasesCreated}`)
  console.log(`新規食材追加: ${result.newIngredientsCreated}`)

  if (result.errors.length > 0) {
    console.log(`\nエラー (${result.errors.length} 件):`)
    for (const err of result.errors) {
      console.log(`  - ${err}`)
    }
  }
}

main().catch((err) => {
  console.error('エラー:', err)
  process.exit(1)
})
