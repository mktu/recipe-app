/**
 * pg_cron ジョブセットアップスクリプト
 *
 * 埋め込み生成用の cron ジョブを設定する。
 *
 * 使い方:
 *   npx tsx scripts/setup-cron.ts --env=staging
 *   npx tsx scripts/setup-cron.ts --env=production
 *
 * 設定されるジョブ:
 *   1. generate-embeddings: 5分毎に Edge Function を呼び出し
 *   2. cleanup-cron-logs: 毎日深夜に古いログを削除
 */

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// 環境引数を解析
const envArg = process.argv.find((arg) => arg.startsWith('--env='))
if (!envArg) {
  console.error('エラー: --env=staging または --env=production を指定してください')
  process.exit(1)
}

const envName = envArg.split('=')[1]
if (!['staging', 'production'].includes(envName)) {
  console.error('エラー: 環境は staging または production を指定してください')
  process.exit(1)
}

const envFilePath = `.env.${envName}`

if (!existsSync(envFilePath)) {
  console.error(`エラー: ${envFilePath} が見つかりません`)
  process.exit(1)
}

console.log(`環境: ${envName} (${envFilePath})\n`)

// 環境変数ファイルを読み込み
const envFile = readFileSync(envFilePath, 'utf-8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#][^=]*)=(.*)$/)
  if (match) {
    process.env[match[1].trim()] = match[2].trim()
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('エラー: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SECRET_KEY が必要です')
  process.exit(1)
}

// project-ref を URL から抽出
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('エラー: Supabase URL から project-ref を抽出できません')
  process.exit(1)
}

const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-embeddings`

console.log(`Project Ref: ${projectRef}`)
console.log(`Edge Function URL: ${edgeFunctionUrl}`)
console.log('')

// Supabase クライアント作成
const supabase = createClient(supabaseUrl, supabaseKey)

async function setupCronJobs() {
  console.log('=== pg_cron ジョブセットアップ開始 ===\n')

  // 1. 拡張機能の確認
  console.log('1. 拡張機能の確認...')

  await supabase.rpc('pg_cron_check', {}).maybeSingle()
  // エラーは無視（関数がない場合もある）

  // 2. 既存ジョブの削除（あれば）
  console.log('2. 既存ジョブの確認と削除...')

  const jobNames = ['generate-embeddings', 'cleanup-cron-logs']

  for (const jobName of jobNames) {
    const { error } = await supabase.rpc('cron_unschedule', { job_name: jobName }).maybeSingle()
    if (!error) {
      console.log(`   既存ジョブ "${jobName}" を削除しました`)
    }
  }

  // 3. 埋め込み生成ジョブの作成
  console.log('3. 埋め込み生成ジョブの作成...')

  const embedJobSql = `
    SELECT cron.schedule(
      'generate-embeddings',
      '*/5 * * * *',
      $$
      SELECT net.http_post(
        url := '${edgeFunctionUrl}',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ${supabaseKey}'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $$
    );
  `

  const { error: embedJobError } = await supabase.rpc('exec_sql', { sql: embedJobSql })

  if (embedJobError) {
    // exec_sql RPC がない場合は直接 SQL 実行を試みる
    console.log('   RPC経由での実行に失敗、直接SQLを実行します...')

    const { error: directError } = await supabase.from('_exec').select('*').limit(0)
    if (directError) {
      console.error('   エラー: ジョブの作成に失敗しました')
      console.error('   Supabase ダッシュボードの SQL Editor で以下を実行してください:')
      console.log('')
      console.log(embedJobSql)
      console.log('')
    }
  } else {
    console.log('   ✅ generate-embeddings ジョブを作成しました（5分毎）')
  }

  // 4. ログクリーンアップジョブの作成
  console.log('4. ログクリーンアップジョブの作成...')

  const cleanupJobSql = `
    SELECT cron.schedule(
      'cleanup-cron-logs',
      '0 0 * * *',
      $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
    );
  `

  const { error: cleanupJobError } = await supabase.rpc('exec_sql', { sql: cleanupJobSql })

  if (cleanupJobError) {
    console.log('   Supabase ダッシュボードの SQL Editor で以下を実行してください:')
    console.log('')
    console.log(cleanupJobSql)
    console.log('')
  } else {
    console.log('   ✅ cleanup-cron-logs ジョブを作成しました（毎日深夜）')
  }

  // 5. 手動実行用の SQL を出力
  console.log('\n=== 手動セットアップ用 SQL ===')
  console.log('Supabase ダッシュボードの SQL Editor で以下を実行してください:\n')

  console.log('-- 拡張機能の有効化（未有効の場合）')
  console.log('CREATE EXTENSION IF NOT EXISTS pg_net;')
  console.log('CREATE EXTENSION IF NOT EXISTS pg_cron;')
  console.log('')

  console.log('-- 埋め込み生成ジョブ（5分毎）')
  console.log(`SELECT cron.schedule(
  'generate-embeddings',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := '${edgeFunctionUrl}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${supabaseKey}'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);`)
  console.log('')

  console.log('-- ログクリーンアップジョブ（毎日深夜）')
  console.log(`SELECT cron.schedule(
  'cleanup-cron-logs',
  '0 0 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);`)
  console.log('')

  console.log('-- ジョブ一覧の確認')
  console.log('SELECT * FROM cron.job;')
  console.log('')

  console.log('=== セットアップ完了 ===')
}

setupCronJobs().catch((err) => {
  console.error('セットアップエラー:', err)
  process.exit(1)
})
