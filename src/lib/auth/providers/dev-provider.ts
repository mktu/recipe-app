import type { AuthProviderAdapter, AuthUser } from '../types'
import { DEV_USER } from '../constants'

export function createDevProvider(): AuthProviderAdapter {
  return {
    async initialize() {
      console.log('[DevAuth] 開発モードで認証をスキップ')
    },

    async getUser(): Promise<AuthUser> {
      return DEV_USER
    },

    isLoggedIn(): boolean {
      return true
    },

    async logout(): Promise<void> {
      console.log('[DevAuth] 開発モードではログアウト不可')
    },

    async relogin(): Promise<void> {
      console.log('[DevAuth] 開発モードでは再ログイン不可')
    },
  }
}
