'use client'

import { useContext } from 'react'
import { AuthContext } from './context'
import type { AuthContextValue } from './types'

/**
 * 認証状態にアクセスするフック
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isLoading, isAuthenticated } = useAuth()
 *
 *   if (isLoading) return <Loading />
 *   if (!isAuthenticated) return <LoginPrompt />
 *
 *   return <div>こんにちは、{user.displayName}さん</div>
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth は AuthProvider の中で使用してください')
  }

  return context
}
