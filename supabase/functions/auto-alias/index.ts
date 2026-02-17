/**
 * 食材エイリアス自動生成 Edge Function
 *
 * pg_cron から1日1回呼び出され、未マッチ食材をLLMで判定し
 * エイリアス登録または新規食材追加を行う。
 *
 * 非同期パターン:
 * - すぐにレスポンスを返す（cronタイムアウト回避）
 * - バックグラウンドで処理を継続
 *
 * ADR-001: 食材マッチングの表記揺れ対応
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

// NOTE: alias-generator.ts はビルド時に自動生成されます
// ソース: src/lib/batch/alias-generator.ts
// 生成コマンド: npx tsx scripts/build-edge-functions.ts
import { generateAliases } from './alias-generator.ts'

const MAX_ITEMS_PER_RUN = 100

Deno.serve(async () => {
  // 環境変数の取得
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiApiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase credentials' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // バックグラウンドで処理開始（awaitしない）
  const supabase = createClient(supabaseUrl, supabaseKey)

  generateAliases(supabase, {
    limit: MAX_ITEMS_PER_RUN,
    geminiApiKey,
  })
    .then((result) => {
      console.log('[auto-alias] Completed:', result)
    })
    .catch((err) => {
      console.error('[auto-alias] Background process error:', err)
    })

  // すぐにレスポンスを返す（cronタイムアウト回避）
  return new Response(
    JSON.stringify({ status: 'accepted', message: 'Processing started in background' }),
    { status: 202, headers: { 'Content-Type': 'application/json' } }
  )
})
