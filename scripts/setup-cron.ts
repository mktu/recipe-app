/**
 * pg_cron ジョブセットアップスクリプト
 *
 * 本番・ステージングで動かす cron ジョブ定義の正本。
 * ここに無いジョブは「存在しないはず」と読めるように、全ジョブを JOBS に列挙する。
 *
 * Supabase のマネージド環境には任意 SQL を実行する RPC が無いため、
 * このスクリプトは**貼り付け用の冪等な SQL を出力する**役割に徹する。
 * 出力を Supabase ダッシュボードの SQL Editor で実行すること。
 *
 * 使い方:
 *   npx tsx scripts/setup-cron.ts --env=staging
 *   npx tsx scripts/setup-cron.ts --env=production
 *
 * 注意:
 *   - Edge Function を呼ぶジョブは、対象関数がデプロイ済みであること
 *   - 出力 SQL には secret key が平文で入る（cron.job テーブルにも残る）。
 *     キーをローテーションしたらこのスクリプトを流し直して貼り替える
 */

import { readFileSync, existsSync } from 'fs'

// ===========================================
// ジョブ定義（cron の正本）
// ===========================================

interface EdgeFunctionJob {
  name: string
  schedule: string
  /** 呼び出す Edge Function 名 */
  functionName: string
  description: string
}

interface SqlJob {
  name: string
  schedule: string
  /** cron.schedule に渡す SQL（$$ で囲まれる） */
  sql: string
  description: string
}

type Job = EdgeFunctionJob | SqlJob

function isEdgeFunctionJob(job: Job): job is EdgeFunctionJob {
  return 'functionName' in job
}

/** schedule はすべて UTC */
const JOBS: Job[] = [
  {
    name: 'generate-embeddings',
    schedule: '*/5 * * * *',
    functionName: 'generate-embeddings',
    description: '埋め込みベクトル生成（5分毎）',
  },
  {
    name: 'auto-alias-daily',
    schedule: '0 18 * * *',
    functionName: 'auto-alias',
    description: '食材エイリアス自動生成（毎日 JST 03:00）',
  },
  {
    name: 'audit-auto-generated-weekly',
    schedule: '0 0 * * 1',
    functionName: 'audit-auto-generated',
    description: '自動追加食材の監査レポートを管理者へ LINE 通知（毎週月曜 JST 09:00）',
  },
  {
    name: 'cleanup-cron-logs',
    schedule: '0 0 * * *',
    sql: "DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'",
    description: '古い cron 実行ログの削除（毎日 UTC 00:00）',
  },
]

// ===========================================
// 環境変数
// ===========================================

function loadEnv(): { supabaseUrl: string; supabaseKey: string; envName: string } {
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

  return { supabaseUrl, supabaseKey, envName }
}

// ===========================================
// SQL 生成
// ===========================================

/** Edge Function を叩く net.http_post 呼び出し */
function httpPostSql(functionUrl: string, supabaseKey: string): string {
  return `  SELECT net.http_post(
    url := '${functionUrl}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${supabaseKey}'
    ),
    body := '{}'::jsonb
  ) AS request_id;`
}

function jobSql(job: Job, supabaseUrl: string, supabaseKey: string): string {
  const command = isEdgeFunctionJob(job)
    ? `\n${httpPostSql(`${supabaseUrl}/functions/v1/${job.functionName}`, supabaseKey)}\n  `
    : job.sql

  return [
    `-- ${job.description}`,
    // 冪等化: 既存ジョブがあれば先に外す（cron.schedule は同名でも別ジョブを作り得る）
    `SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = '${job.name}';`,
    `SELECT cron.schedule(`,
    `  '${job.name}',`,
    `  '${job.schedule}',`,
    `  $$${command}$$`,
    `);`,
  ].join('\n')
}

// ===========================================
// メイン
// ===========================================

function main(): void {
  const { supabaseUrl, supabaseKey, envName } = loadEnv()

  console.log(`-- 環境: ${envName}`)
  console.log(`-- Supabase: ${supabaseUrl}`)
  console.log('--')
  console.log('-- 以下を Supabase ダッシュボードの SQL Editor で実行してください。')
  console.log('-- 何度実行しても同じ状態になります（既存ジョブは unschedule してから再作成）。')
  console.log('')

  console.log('-- 拡張機能の有効化（未有効の場合）')
  console.log('CREATE EXTENSION IF NOT EXISTS pg_net;')
  console.log('CREATE EXTENSION IF NOT EXISTS pg_cron;')
  console.log('')

  for (const job of JOBS) {
    console.log(jobSql(job, supabaseUrl, supabaseKey))
    console.log('')
  }

  console.log('-- 登録結果の確認')
  console.log('SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;')
  console.log('')
  console.log('-- 直近の実行結果')
  console.log(
    'SELECT j.jobname, d.status, d.start_time FROM cron.job_run_details d JOIN cron.job j USING (jobid) ORDER BY d.start_time DESC LIMIT 20;'
  )
}

main()
