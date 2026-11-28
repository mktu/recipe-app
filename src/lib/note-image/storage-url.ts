import { NOTE_IMAGE_BUCKET } from './constants'

const PUBLIC_PREFIX = `/storage/v1/object/public/${NOTE_IMAGE_BUCKET}/`

/**
 * 新しい画像のパス。毎回ランダムにする（同じ名前で上書きすると CDN に古い画像が残る）。
 * 退会時に `<user_id>/` 配下をまとめて消せるよう、ユーザー ID で始める
 */
export function newNoteImagePath(userId: string): string {
  return `${userId}/${crypto.randomUUID()}.jpg`
}

/** DB の `generated_image_url` に入れる公開 URL */
export function noteImagePublicUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}${PUBLIC_PREFIX}${path}`
}

/** 公開 URL から Storage のパスを取り出す。このバケットの URL でなければ null */
export function noteImagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const index = url.indexOf(PUBLIC_PREFIX)
  if (index < 0) return null
  const path = url.slice(index + PUBLIC_PREFIX.length)
  return path.length > 0 ? path : null
}
