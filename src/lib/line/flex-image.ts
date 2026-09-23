import type { messagingApi } from '@line/bot-sdk'
import { FALLBACK_IMAGE_PATH } from '@/lib/recipe/placeholder-images'

/** 自前アセットの相対パスか（`//host/...` のプロトコル相対 URL は外部として扱う） */
function isRelativePath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * Flex の image に渡す URL を決める。
 *
 * **Flex の image は絶対 https URL しか受け付けない。** `recipes.image_url` には外部サイトの
 * 絶対 URL と、ノートのプレースホルダー（`/placeholders/<key>.png`）の相対パスが混在するため、
 * 相対パスは `NEXT_PUBLIC_APP_URL` と合成する（track URL と同じやり方。`recipe-card-mapper.ts`）。
 * 画像を持たないレシピには「NO IMAGE」画像を当てる。
 *
 * `NEXT_PUBLIC_APP_URL` が未設定だと絶対 URL を作れないので null を返し、呼び出し側は
 * image を省く。不正な URL を渡すと reply 全体が 400 で落ちるため、画像なしのほうがまし。
 */
export function toFlexImageUrl(imageUrl: string | null | undefined): string | null {
  const url = imageUrl || FALLBACK_IMAGE_PATH
  if (!isRelativePath(url)) return url

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return null
  return new URL(url, appUrl).toString()
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
