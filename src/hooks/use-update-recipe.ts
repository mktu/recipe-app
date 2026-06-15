'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import type { UpdateRecipeInput } from '@/types/recipe'

export function useUpdateRecipe(recipeId: string) {
  const { user } = useAuth()
  const authedFetch = useAuthedFetch()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateRecipe = useCallback(
    async (input: UpdateRecipeInput): Promise<boolean> => {
      if (!user) {
        setError(new Error('認証が必要です'))
        return false
      }
      setIsLoading(true)
      setError(null)

      try {
        const res = await authedFetch(`/api/recipes/${recipeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'レシピの更新に失敗しました')
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [recipeId, user, authedFetch]
  )

  return { updateRecipe, isLoading, error }
}
