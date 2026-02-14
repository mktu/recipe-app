'use client'

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthContextValue, AuthProviderAdapter, AuthUser } from './types'

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  adapter: AuthProviderAdapter
}

export function AuthProvider({ children, adapter }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function init() {
      const startTime = Date.now()
      try {
        console.log('[Auth] 初期化開始')
        await adapter.initialize()
        console.log('[Auth] initialize完了:', Date.now() - startTime, 'ms')

        const t = Date.now()
        const currentUser = await adapter.getUser()
        console.log('[Auth] getUser完了:', Date.now() - t, 'ms')

        if (isMounted) {
          setUser(currentUser)
        }
        console.log('[Auth] 初期化完了 合計:', Date.now() - startTime, 'ms')
      } catch (err) {
        console.error('[Auth] 初期化エラー:', err)
        if (isMounted) {
          const message = err instanceof Error ? err.message : String(err)
          setError(`認証エラー: ${message}`)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [adapter])

  const logout = useCallback(async () => {
    await adapter.logout()
    setUser(null)
  }, [adapter])

  const relogin = useCallback(async () => {
    await adapter.relogin()
  }, [adapter])

  const value: AuthContextValue = {
    user,
    status: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
    isAuthenticated: !!user,
    isLoading,
    error,
    logout,
    relogin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
