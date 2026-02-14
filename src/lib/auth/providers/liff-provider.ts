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
      const t1 = Date.now()
      const liffModule = await import('@line/liff')
      console.log('[LIFF] SDK import:', Date.now() - t1, 'ms')

      liff = liffModule.default

      const t2 = Date.now()
      await liff.init({ liffId: id })
      console.log('[LIFF] init:', Date.now() - t2, 'ms')

      if (!liff.isLoggedIn()) liff.login()
    },

    async getUser(): Promise<AuthUser | null> {
      if (!liff || !liff.isLoggedIn()) return null
      const t = Date.now()
      const result = await fetchProfileWithRetry(() => adapter.getUser())
      console.log('[LIFF] getProfile:', Date.now() - t, 'ms')
      return result
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
