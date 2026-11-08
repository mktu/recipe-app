/**
 * アプリ自身のページの URL かどうか（#230）
 *
 * アプリのページ（マイレシピ・ホームなど）は認証をクライアント側でしか行っていないため、
 * HTTP で取得するとアプリ全体の OGP（「RecipeHub - レシピ保存アプリ」）が返り、中身の無いレシピが登録されてしまう。
 * LINE と Web の登録の入口で、この関数を使って断る。
 *
 * 判定はホストだけで行う。`NEXT_PUBLIC_APP_URL` のホストと LIFF（`liff.line.me`）が対象。
 * Vercel の別名ホスト（ブランチ用エイリアス・デプロイごとの固有 URL）はすり抜けるが、
 * 利用者がコピーするのは LIFF の URL かエンドポイント（＝`NEXT_PUBLIC_APP_URL`）なので対象にしていない。
 *
 * ブラウザからも呼ぶ（`url-input-form.tsx`）。`NEXT_PUBLIC_` の環境変数はビルド時に埋め込まれる。
 */
const LIFF_HOST = 'liff.line.me'

function hostOf(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export function isOwnAppUrl(url: string): boolean {
  const host = hostOf(url)
  if (!host) return false
  if (host === LIFF_HOST) return true

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return false
  return host === hostOf(appUrl)
}
