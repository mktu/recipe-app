import { after } from 'next/server'

/**
 * マイレシピの AI 画像の生成を、応答を返したあとに Edge Function `generate-note-images` に頼む（#287）
 *
 * 生成には十数秒かかるので登録の応答（LINE の返信を含む）は待たせない。
 * ここで失敗してもノートは pending のまま残り、cron が拾い直すので、呼び出し元には失敗を返さない
 */
export function requestNoteImageGeneration(noteId: string): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) return

  after(async () => {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-note-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ noteId }),
      })
      if (!response.ok) {
        console.error('[requestNoteImageGeneration] Edge Function error:', response.status, await response.text())
      }
    } catch (err) {
      console.error('[requestNoteImageGeneration] Failed to call Edge Function:', err)
    }
  })
}
