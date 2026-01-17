import type { AuthProviderAdapter, AuthUser } from '../types'

type LiffType = typeof import('@line/liff').default

let liff: LiffType | null = null

export function createLiffProvider(liffId: string): AuthProviderAdapter {
  return {
    async initialize() {
      const liffModule = await import('@line/liff')
      liff = liffModule.default

      await liff.init({ liffId })

      if (!liff.isLoggedIn()) {
        liff.login()
      }
    },

    async getUser(): Promise<AuthUser | null> {
      if (!liff || !liff.isLoggedIn()) {
        return null
      }

      const profile = await liff.getProfile()

      return {
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
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
  }
}
