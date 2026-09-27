/**
 * LINE のカードから開かれたことを示すクエリ。ノート画面はこれを見て閲覧を記録する（`toRecipeCardUrl`）
 */
export const LINE_VIEW_PARAM = 'from'
export const LINE_VIEW_VALUE = 'line'

/**
 * LINE のカード（Flex のボタン）に載せる URL を組み立てる。
 *
 * - 外部サイトのレシピは閲覧記録ルート `/api/track/recipe/[id]` を経由し、記録してから元サイトへ飛ばす
 * - レシピノート（url が相対パス `/notes/<note_id>`）は、**最初から LIFF URL を載せる**。
 *   track ルートを挟むと、LINE はまず https の URL を内蔵ブラウザで開き、302 先の LIFF を
 *   その上に別画面で開く。LIFF を閉じると、リダイレクトしただけの空白ページが下に残る。
 *   閲覧記録はノート画面が `?from=line` を見て LIFF 側から行う（POST /api/track/recipe/[id]）
 *
 * LIFF_ID が空の dev では LIFF URL を作れないので、ノートも track ルートに回す。
 */
export function toRecipeCardUrl(recipe: { id: string; url: string }): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (recipe.url.startsWith('/') && liffId) {
    return `https://liff.line.me/${liffId}${recipe.url}?${LINE_VIEW_PARAM}=${LINE_VIEW_VALUE}`
  }
  return `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/track/recipe/${recipe.id}`
}

/**
 * LINE のカード（閲覧記録ルート `/api/track/recipe/[id]`）からのリダイレクト先を組み立てる。
 *
 * 新しく送るノートのカードは `toRecipeCardUrl` で LIFF URL を直接載せるのでここを通らない。
 * ここに来るのは、それ以前に送ったトーク履歴上のカードと dev。
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
