/**
 * 検索語の正規化
 *
 * Bot / Web の両方から使う。Edge Function にもコピーされるため、
 * 外部依存を持たず相対 import のみで完結させること。
 */

/** ひらがな → カタカナ に変換 */
export function toKatakana(str: string): string {
  return str.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
}

/** 全角英数字 → 半角に変換 */
function toHalfWidth(str: string): string {
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}

/**
 * 照合キーへの正規化
 * ひらがな/カタカナ・全角/半角・大文字/小文字の差を吸収する
 *
 * @example
 * normalizeSearchKey('ジャガイモ') // → 'ジャガイモ'
 * normalizeSearchKey('じゃがいも') // → 'ジャガイモ'（マスタ側も同じキーになる）
 */
export function normalizeSearchKey(str: string): string {
  return toKatakana(toHalfWidth(str.trim().toLowerCase()))
}

/** 全角/半角スペース区切りで検索語を分割 */
export function splitSearchWords(input: string): string[] {
  return input.split(/[\s　]+/).filter((w) => w.length > 0)
}
