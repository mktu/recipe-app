import type { messagingApi } from '@line/bot-sdk'
import { FALLBACK_IMAGE_PATH } from '@/lib/recipe/placeholder-images'

/** 自前アセットの相対パスか（`//host/...` のプロトコル相対 URL は外部として扱う） */
function isRelativePath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * Flex に渡せる絶対 https URL にする。渡せなければ null。
 *
 * 相対パスは `NEXT_PUBLIC_APP_URL` と合成する（track URL と同じやり方。`recipe-card-mapper.ts`）。
 * APP_URL が未設定のとき、`http://localhost:3000`（`.env.example`）のように https でないとき、
 * 外部サイトの画像が http のとき、URL として解釈できないときはいずれも null。
 */
function toHttpsUrl(url: string): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (isRelativePath(url) && !appUrl) return null

  try {
    const resolved = isRelativePath(url) ? new URL(url, appUrl) : new URL(url)
    return resolved.protocol === 'https:' ? resolved.toString() : null
  } catch {
    return null
  }
}

/**
 * Flex の image に渡す URL を決める。
 *
 * **Flex の image は絶対 https URL しか受け付けず、1つでも不正だと reply 全体が 400 で落ちる。**
 * 失敗はユーザーには「既読のみで無反応」に見えて原因を追いにくい（#170）。
 * `recipes.image_url` には外部サイトの絶対 URL と、ノートのプレースホルダー
 * （`/placeholders/<key>.png`）の相対パスが混在するため、ここで Flex に渡せる形に揃える。
 *
 * - 画像を持たないレシピ、画像が Flex に渡せない（http など）レシピには「NO IMAGE」画像を当てる
 * - その NO IMAGE 画像も渡せない（APP_URL が未設定・http）ときは null を返し、呼び出し側は image を省く
 */
export function toFlexImageUrl(imageUrl: string | null | undefined): string | null {
  const url = imageUrl ? toHttpsUrl(imageUrl) : null
  return url ?? toHttpsUrl(FALLBACK_IMAGE_PATH)
}

/** カードの hero 画像。URL を作れないときは hero ごと省く */
export function createHeroImage(imageUrl: string | null | undefined): messagingApi.FlexImage | undefined {
  const url = toFlexImageUrl(imageUrl)
  if (!url) return undefined
  return { type: 'image', url, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' }
}

/** 縦リストのサムネイル。URL を作れないときは省く */
export function createThumbnail(imageUrl: string | null | undefined): messagingApi.FlexImage[] {
  const url = toFlexImageUrl(imageUrl)
  return url ? [{ type: 'image', url, size: 'sm', aspectRatio: '1:1', aspectMode: 'cover', flex: 0 }] : []
}
