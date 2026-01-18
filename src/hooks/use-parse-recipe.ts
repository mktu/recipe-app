'use client'

import { useState, useCallback } from 'react'
import type { ParsedRecipe } from '@/types/recipe'

interface UseParseRecipeReturn {
  parseRecipe: (url: string) => Promise<ParsedRecipe | null>
  isLoading: boolean
  error: Error | null
}

/**
 * URLからレシピ情報を解析するhook
 */
export function useParseRecipe(): UseParseRecipeReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const parseRecipe = useCallback(async (url: string): Promise<ParsedRecipe | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'レシピの解析に失敗しました')
      }

      const result = (await response.json()) as ParsedRecipe
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { parseRecipe, isLoading, error }
}
