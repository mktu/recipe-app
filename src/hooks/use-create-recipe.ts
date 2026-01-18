'use client'

import { useState, useCallback } from 'react'
import type { CreateRecipeInput } from '@/types/recipe'

interface CreateRecipeResult {
  id: string
}

interface UseCreateRecipeReturn {
  createRecipe: (input: CreateRecipeInput) => Promise<CreateRecipeResult | null>
  isLoading: boolean
  error: Error | null
}

/**
 * レシピを新規作成するhook
 */
export function useCreateRecipe(): UseCreateRecipeReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createRecipe = useCallback(
    async (input: CreateRecipeInput): Promise<CreateRecipeResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'レシピの保存に失敗しました')
        }

        const result = (await response.json()) as CreateRecipeResult
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { createRecipe, isLoading, error }
}
