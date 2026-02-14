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

function isTokenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return message.includes('revoked') || message.includes('expired')
}

async function fetchProfileWithRetry(getUser: () => Promise<AuthUser | null>): Promise<AuthUser | null> {
  try {
    const profile = await liff!.getProfile()
    clearRetryCount()
    return { lineUserId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl }
  } catch (error) {
    if (isTokenError(error) && getRetryCount() < MAX_RETRIES) {
      incrementRetryCount()
      await liff!.init({ liffId: liffId! })
      if (!liff!.isLoggedIn()) liff!.login()
      return getUser()
    }
    clearRetryCount()
    throw error
  }
}

export function createLiffProvider(id: string): AuthProviderAdapter {
  liffId = id

  const adapter: AuthProviderAdapter = {
    async initialize() {
      const liffModule = await import('@line/liff')
      liff = liffModule.default
      await liff.init({ liffId: id })
      if (!liff.isLoggedIn()) liff.login()
    },

    async getUser(): Promise<AuthUser | null> {
      if (!liff || !liff.isLoggedIn()) return null
      return fetchProfileWithRetry(() => adapter.getUser())
    },

    isLoggedIn: () => liff?.isLoggedIn() ?? false,

    async logout() {
      if (liff?.isLoggedIn()) {
        liff.logout()
        window.location.reload()
      }
    },

    async relogin() {
      if (!liff) return
      if (liff.isLoggedIn()) liff.logout()
      clearRetryCount()
      liff.login()
    },
  }

  return adapter
}
