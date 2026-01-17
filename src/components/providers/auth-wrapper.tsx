'use client'

import { useMemo, type ReactNode } from 'react'
import {
  AuthProvider,
  createDevProvider,
  createLiffProvider,
} from '@/lib/auth'

interface AuthWrapperProps {
  children: ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const adapter = useMemo(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID

    // LIFF ID がない場合は開発モードにフォールバック
    if (!liffId) {
      return createDevProvider()
    }

    return createLiffProvider(liffId)
  }, [])

  return <AuthProvider adapter={adapter}>{children}</AuthProvider>
}
