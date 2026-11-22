/**
 * 文字数の上限に収まるよう、末尾を「…」に置き換えて丸める。
 *
 * LINE の上限が UTF-16 単位かコードポイント単位かは確かでないので、厳しいほう（UTF-16 の長さ）で収める。
 * ただし UTF-16 単位で単純に切ると絵文字（サロゲートペア）が半分だけ残って文字化けするので、
 * コードポイントの境目でしか切らない。
 */
export function truncateByCodePoint(text: string, max: number): string {
  if (text.length <= max) return text
  let head = ''
  for (const char of text) {
    if (head.length + char.length > max - 1) break
    head += char
  }
  return `${head}…`
}
