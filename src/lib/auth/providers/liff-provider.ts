import type { AuthProviderAdapter, AuthUser } from '../types'

type LiffType = typeof import('@line/liff').default

let liff: LiffType | null = null
let liffId: string | null = null

const RETRY_KEY = 'liff_auth_retry'
const MAX_RETRIES = 2

function getRetryCount(): number {
  if (typeof window === 'undefined') return 0
  return Number(sessionStorage.getItem(RETRY_KEY) || '0')
}

function incrementRetryCount(): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(RETRY_KEY, String(getRetryCount() + 1))
}

function clearRetryCount(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(RETRY_KEY)
}

export function createLiffProvider(id: string): AuthProviderAdapter {
  liffId = id

  return {
    async initialize() {
      const liffModule = await import('@line/liff')
      liff = liffModule.default

      await liff.init({ liffId: id })

      if (!liff.isLoggedIn()) {
        liff.login()
      }
    },

    async getUser(): Promise<AuthUser | null> {
      if (!liff || !liff.isLoggedIn()) {
        return null
      }

      try {
        const profile = await liff.getProfile()
        // 成功したらリトライカウントをリセット
        clearRetryCount()
        return {
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        const isTokenError = message.includes('revoked') || message.includes('expired')

        if (isTokenError && getRetryCount() < MAX_RETRIES) {
          incrementRetryCount()
          // liff.init() を再実行してトークンをリフレッシュ
          await liff.init({ liffId: liffId! })
          if (!liff.isLoggedIn()) {
            liff.login()
          }
          // 再度プロフィール取得を試みる
          return this.getUser()
        }

        // リトライ上限超過またはその他のエラー
        clearRetryCount()
        throw error
      }
    },

    isLoggedIn(): boolean {
      return liff?.isLoggedIn() ?? false
    },

    async logout(): Promise<void> {
      if (liff && liff.isLoggedIn()) {
        liff.logout()
        window.location.reload()
      }
    },

    async relogin(): Promise<void> {
      if (!liff) return
      // ログアウトしてからログイン（トークンを完全にリセット）
      if (liff.isLoggedIn()) {
        liff.logout()
      }
      clearRetryCount()
      liff.login()
    },
  }
}
