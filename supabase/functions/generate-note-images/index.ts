/**
 * マイレシピの AI 画像生成 Edge Function（#287）
 *
 * 呼び出し元:
 *   - 登録直後: アプリが応答を返したあとに `{ noteId }` 付きで呼ぶ（src/lib/recipe/request-note-image.ts）
 *   - pg_cron: 作る対象（pending・生成中のまま止まったもの）があるときだけ、本文なしで呼ぶ（失敗の作り直し）
 *
 * 本体は src/lib/note-image/ からビルドでコピーされる（npm run functions:build）。
 *
 * 環境変数:
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: 自動設定
 *   - GOOGLE_GENERATIVE_AI_API_KEY: Secrets に設定（auto-alias と共通）
 *   - NEXT_PUBLIC_SUPABASE_URL: ローカルだけ（functions:serve が .env.local から渡す）。
 *     ローカルの SUPABASE_URL は Docker 内部の http://kong:8000 で、ブラウザから開けない公開 URL になるため
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { generateNoteImages } from './generate-note-images.ts'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function readNoteId(req: Request): Promise<string | undefined | null> {
  const body = await req.json().catch(() => ({}))
  const noteId = body?.noteId
  if (noteId === undefined) return undefined
  return typeof noteId === 'string' && UUID_PATTERN.test(noteId) ? noteId : null
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiApiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')
  if (!supabaseUrl || !supabaseKey) return json({ error: 'Missing Supabase credentials' }, 500)
  if (!geminiApiKey) return json({ error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY' }, 500)

  const noteId = await readNoteId(req)
  if (noteId === null) return json({ error: 'Invalid noteId' }, 400)

  try {
    const result = await generateNoteImages(createClient(supabaseUrl, supabaseKey), {
      noteId,
      publicSupabaseUrl: Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? supabaseUrl,
      geminiApiKey,
    })
    return json(result)
  } catch (error) {
    console.error('[generate-note-images] error:', error)
    return json({ error: 'エラーが発生しました' }, 500)
  }
})
