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
      try {
        await adapter.initialize()
        const currentUser = await adapter.getUser()
        if (isMounted) {
          setUser(currentUser)
        }
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

  const value: AuthContextValue = {
    user,
    status: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
    isAuthenticated: !!user,
    isLoading,
    error,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
