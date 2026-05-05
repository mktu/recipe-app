'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import type { ParsedRecipe } from '@/types/recipe'

export function useRescrape() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<ParsedRecipe | null>(null)

  const rescrape = useCallback(async (url: string) => {
    if (!user) { setError(new Error('認証が必要です')); return }
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, lineUserId: user.lineUserId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'レシピの再取得に失敗しました')
      }
      setResult(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [user])

  return { rescrape, isLoading, error, result }
}
