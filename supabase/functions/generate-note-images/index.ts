/**
 * マイレシピの AI 画像生成 Edge Function（#287）
 *
 * 呼び出し元:
 *   - 登録直後: アプリが応答を返したあとに `{ noteId }` 付きで呼ぶ（src/lib/recipe/request-note-image.ts）。
 *     終わるまで待って結果を返す
 *   - pg_cron: 作る対象（pending・生成中のまま止まったもの）があるときだけ、本文なしで呼ぶ（失敗の作り直し）。
 *     pg_net は 5 秒で切るので、202 を先に返して裏で処理する（auto-alias と同じ）
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
// npm: 版は Node のネイティブ codec を読みにいき、Edge Runtime では `unsupported arch/platform` で落ちる
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'
import { generateNoteImages } from './generate-note-images.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 一覧のサムネイル（80px）から詳細（全幅）・LINE のカードまで足りる大きさ。1K のままだと 1 枚約 1MB ある */
const MAX_EDGE = 640
const JPEG_QUALITY = 80

/**
 * Edge Function の CPU 時間の上限（2 秒）を超えるとワーカーごと止められ、catch では拾えない。
 * かかった時間をログに出しておく（経過時間 ≒ CPU 時間。wasm の処理で I/O を挟まないため）
 */
async function shrinkImage(bytes: Uint8Array): Promise<Uint8Array> {
  const started = performance.now()
  const image = await Image.decode(bytes)
  if (image.width > MAX_EDGE || image.height > MAX_EDGE) {
    if (image.width >= image.height) image.resize(MAX_EDGE, Image.RESIZE_AUTO)
    else image.resize(Image.RESIZE_AUTO, MAX_EDGE)
  }
  const encoded = await image.encodeJPEG(JPEG_QUALITY)
  console.log(`[generate-note-images] shrink ${bytes.length} -> ${encoded.length} bytes in ${Math.round(performance.now() - started)}ms`)
  return encoded
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function readNoteId(req: Request): Promise<string | undefined | null> {
  const body = await req.json().catch(() => ({}))
  const noteId = body?.noteId
  if (noteId === undefined) return undefined
  return typeof noteId === 'string' && UUID_PATTERN.test(noteId) ? noteId : null
}

function runInBackground(task: Promise<unknown>): void {
  const logged = task
    .then((result) => console.log('[generate-note-images] Completed:', result))
    .catch((err) => console.error('[generate-note-images] Background process error:', err))
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(logged)
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiApiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')
  if (!supabaseUrl || !supabaseKey) return json({ error: 'Missing Supabase credentials' }, 500)
  if (!geminiApiKey) return json({ error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY' }, 500)

  const noteId = await readNoteId(req)
  if (noteId === null) return json({ error: 'Invalid noteId' }, 400)

  const task = generateNoteImages(createClient(supabaseUrl, supabaseKey), {
    noteId,
    publicSupabaseUrl: Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? supabaseUrl,
    geminiApiKey,
    shrinkImage,
  })

  if (noteId === undefined) {
    runInBackground(task)
    return json({ status: 'accepted' }, 202)
  }

  try {
    return json(await task)
  } catch (error) {
    console.error('[generate-note-images] error:', error)
    return json({ error: 'エラーが発生しました' }, 500)
  }
})
