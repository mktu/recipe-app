/**
 * 画像の無いレシピに出す表紙（料理名を載せた単色の画像。#287）
 *
 * AI 画像ができるまでの間・生成に失敗したとき・上限を超えたとき、画像の無いブックマークに出す。
 * LINE の Flex は画像の URL しか載せられないので、CSS ではなく `/api/cover` が PNG で描く
 */

/** 長すぎる料理名は URL も表紙も崩れるので切る */
export const COVER_TITLE_MAX_LENGTH = 40

/** 文字が白で読める、落ち着いた色だけを並べる */
const COVER_COLORS = [
  '#C2410C', '#B45309', '#4D7C0F', '#047857', '#0F766E',
  '#0E7490', '#1D4ED8', '#6D28D9', '#A21CAF', '#BE123C',
] as const

export function normalizeCoverTitle(title: string): string {
  return Array.from(title.trim()).slice(0, COVER_TITLE_MAX_LENGTH).join('')
}

/** 同じ料理名なら同じ色になるように、料理名から色を選ぶ */
export function coverColor(title: string): string {
  let hash = 0
  for (const ch of normalizeCoverTitle(title)) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return COVER_COLORS[hash % COVER_COLORS.length]
}

/** 表紙の相対パス。LINE には `toFlexImageUrl` が絶対 URL にして渡す */
export function coverImagePath(title: string): string {
  return `/api/cover?title=${encodeURIComponent(normalizeCoverTitle(title))}`
}

/** 画像があればそれを、無ければ表紙を返す */
export function recipeImageOrCover(imageUrl: string | null | undefined, title: string): string {
  return imageUrl || coverImagePath(title)
}
