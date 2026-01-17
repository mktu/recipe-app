'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { fetchRecipes } from '@/lib/db/queries/recipes'
import type { SortOrder, RecipeWithIngredients } from '@/types/recipe'

interface UseRecipesOptions {
  searchQuery?: string
  ingredientIds?: string[]
  sortOrder?: SortOrder
}

interface UseRecipesReturn {
  recipes: RecipeWithIngredients[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const DEBOUNCE_MS = 300

export function useRecipes(options: UseRecipesOptions = {}): UseRecipesReturn {
  const { searchQuery = '', ingredientIds = [], sortOrder = 'newest' } = options
  const { user } = useAuth()

  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const loadRecipes = useCallback(async () => {
    if (!user) {
      setRecipes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchRecipes({
      userId: user.lineUserId,
      searchQuery,
      ingredientIds,
      sortOrder,
    })

    if (isMountedRef.current) {
      setRecipes(data)
      setError(fetchError)
      setIsLoading(false)
    }
  }, [user, searchQuery, ingredientIds, sortOrder])

  // デバウンス付きで再読み込み
  useEffect(() => {
    isMountedRef.current = true

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      loadRecipes()
    }, searchQuery ? DEBOUNCE_MS : 0)

    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [loadRecipes, searchQuery])

  return { recipes, isLoading, error, refetch: loadRecipes }
}
