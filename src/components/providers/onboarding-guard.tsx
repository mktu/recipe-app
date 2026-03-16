'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface OnboardingGuardProps {
  children: ReactNode
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const isOnboardingPath = pathname.startsWith('/onboarding')

  useEffect(() => {
    if (isLoading || !user || isOnboardingPath) return
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/auth/onboarding-status?lineUserId=${user.lineUserId}`)
        const data = await res.json() as { completed: boolean }
        if (!data.completed) {
          router.replace('/onboarding')
        } else {
          setChecked(true)
        }
      } catch {
        setChecked(true)
      }
    }
    checkStatus()
  }, [user, isLoading, isOnboardingPath, router])

  // オンボーディングページはガード不要
  if (isOnboardingPath) return <>{children}</>
  if (!checked) return null

  return <>{children}</>
}
