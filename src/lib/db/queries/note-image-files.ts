import type { SupabaseClient } from '@supabase/supabase-js'
import { NOTE_IMAGE_BUCKET } from '@/lib/note-image/constants'
import { noteImagePathFromUrl } from '@/lib/note-image/storage-url'
import type { Database } from '@/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

/** Storage の list の 1 回の上限 */
const LIST_PAGE_SIZE = 1000

/**
 * レシピに付いた AI 画像のパス。消す前に引いておく。
 * DB の CASCADE は Storage のファイルを消さないので、レシピを消したあとに `removeNoteImageFiles` で消す
 */
export async function findNoteImagePath(client: TypedSupabaseClient, recipeId: string, userId: string): Promise<string | null> {
  const { data } = await client
    .from('recipe_notes')
    .select('generated_image_url')
    .eq('recipe_id', recipeId)
    .eq('user_id', userId)
    .maybeSingle()
  return noteImagePathFromUrl(data?.generated_image_url)
}

/** 失敗してもレシピの削除は済んでいるので、ログだけ残す（URL が DB から消えれば辿れない） */
export async function removeNoteImageFiles(client: TypedSupabaseClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await client.storage.from(NOTE_IMAGE_BUCKET).remove(paths)
  if (error) console.error('[removeNoteImageFiles] Failed to remove files:', paths, error)
}

/** 退会時に、そのユーザーの AI 画像をまとめて消す（パスは `<user_id>/` で始まる） */
export async function removeUserNoteImages(client: TypedSupabaseClient, userId: string): Promise<void> {
  const bucket = client.storage.from(NOTE_IMAGE_BUCKET)
  for (;;) {
    // 消した分だけ一覧から減るので、毎回先頭から取り直す
    const { data, error } = await bucket.list(userId, { limit: LIST_PAGE_SIZE })
    if (error) {
      console.error('[removeUserNoteImages] Failed to list files:', userId, error)
      return
    }
    if (!data || data.length === 0) return

    const { error: removeError } = await bucket.remove(data.map((file) => `${userId}/${file.name}`))
    if (removeError) {
      console.error('[removeUserNoteImages] Failed to remove files:', userId, removeError)
      return
    }
    if (data.length < LIST_PAGE_SIZE) return
  }
}
