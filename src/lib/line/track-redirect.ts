/**
 * LINE のカード（閲覧記録ルート `/api/track/recipe/[id]`）からのリダイレクト先を組み立てる。
 *
 * レシピノートの url は相対パス `/notes/<note_id>`（保護ページ）。LINE の内蔵ブラウザで
 * 普通の https URL を開いても LIFF のコンテキストにならず、認証が通らない。そのため
 * リッチメニューの「レシピ追加」と同じく LIFF URL（`https://liff.line.me/{LIFF_ID}/<path>`）に振り替える。
 *
 * LIFF_ID が空の dev では、リクエストのオリジンで解決する。NextResponse.redirect は
 * 絶対 URL しか受け付けない（内部の validateURL がベース無しの new URL() に通すため）。
 * 外部サイトの絶対 URL はどちらの場合もそのまま通る。
 */
export function toTrackRedirectUrl(url: string, requestUrl: string): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (url.startsWith('/') && liffId) return `https://liff.line.me/${liffId}${url}`
  return new URL(url, requestUrl).toString()
}
