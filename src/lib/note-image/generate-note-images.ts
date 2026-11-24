import type { SupabaseClient } from '@supabase/supabase-js'
import {
  NOTE_IMAGE_BATCH_LIMIT,
  NOTE_IMAGE_BUCKET,
  NOTE_IMAGE_MAX_ATTEMPTS,
  NOTE_IMAGE_MONTHLY_LIMIT,
} from './constants'
import { requestNoteImage } from './gemini-image'
import { buildNoteImagePrompt } from './prompt'
import { newNoteImagePath, noteImagePathFromUrl, noteImagePublicUrl } from './storage-url'

interface ClaimedNote {
  note_id: string
  user_id: string
  title: string
  ingredients: unknown
  attempt: number
}

export interface GenerateNoteImagesOptions {
  /** 指定すればそのノートだけ（登録直後）。省略すれば作る対象を古い順に（cron） */
  noteId?: string
  /** ブラウザと LINE から取れる Supabase の URL。公開 URL の組み立てに使う */
  publicSupabaseUrl: string
  geminiApiKey: string
}

export interface GenerateNoteImagesResult {
  claimed: number
  succeeded: number
}

/**
 * マイレシピの AI 画像を作る（Edge Function `generate-note-images` の本体）
 *
 * 確保（`claim_note_image_generations`）した行だけを処理するので、登録直後の呼び出しと cron が重なっても
 * 同じノートを二重に作らない。月の上限もこの確保の中で見る
 */
export async function generateNoteImages(
  supabase: SupabaseClient,
  options: GenerateNoteImagesOptions
): Promise<GenerateNoteImagesResult> {
  const { data, error } = await supabase.rpc('claim_note_image_generations', {
    p_note_id: options.noteId ?? null,
    p_limit: NOTE_IMAGE_BATCH_LIMIT,
    p_monthly_limit: NOTE_IMAGE_MONTHLY_LIMIT,
    p_max_attempts: NOTE_IMAGE_MAX_ATTEMPTS,
  })
  if (error) throw new Error(`Failed to claim notes: ${error.message}`)

  const notes = (data ?? []) as ClaimedNote[]
  let succeeded = 0
  for (const note of notes) {
    if (await generateOne(supabase, note, options)) succeeded++
  }
  return { claimed: notes.length, succeeded }
}

async function generateOne(
  supabase: SupabaseClient,
  note: ClaimedNote,
  options: GenerateNoteImagesOptions
): Promise<boolean> {
  let uploadedPath: string | null = null
  try {
    const image = await requestNoteImage(buildNoteImagePrompt(note.title, note.ingredients), options.geminiApiKey)

    const path = newNoteImagePath(note.user_id)
    const { error: uploadError } = await supabase.storage
      .from(NOTE_IMAGE_BUCKET)
      .upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' })
    if (uploadError) throw uploadError
    uploadedPath = path

    const { data: previousUrl, error } = await supabase.rpc('complete_note_image_generation', {
      p_note_id: note.note_id,
      p_image_url: noteImagePublicUrl(options.publicSupabaseUrl, path),
    })
    if (error) throw error

    await removeFile(supabase, noteImagePathFromUrl(previousUrl as string | null))
    return true
  } catch (err) {
    console.error(`[generate-note-images] note ${note.note_id} (attempt ${note.attempt}) failed:`, err)
    // 完了の前に失敗した（ノートが消された等）なら、上げたファイルは誰からも参照されない
    await removeFile(supabase, uploadedPath)
    await releaseClaim(supabase, note)
    return false
  }
}

/** 試行回数が残っていれば作る対象に戻し（cron が拾い直す）、尽きていれば諦める */
async function releaseClaim(supabase: SupabaseClient, note: ClaimedNote): Promise<void> {
  const { error } = await supabase
    .from('recipe_notes')
    .update({
      image_status: note.attempt >= NOTE_IMAGE_MAX_ATTEMPTS ? 'failed' : 'pending',
      image_generation_started_at: null,
    })
    .eq('id', note.note_id)
    .eq('image_status', 'generating')
  if (error) console.error(`[generate-note-images] failed to release note ${note.note_id}:`, error)
}

async function removeFile(supabase: SupabaseClient, path: string | null): Promise<void> {
  if (!path) return
  const { error } = await supabase.storage.from(NOTE_IMAGE_BUCKET).remove([path])
  if (error) console.error(`[generate-note-images] failed to remove ${path}:`, error)
}
