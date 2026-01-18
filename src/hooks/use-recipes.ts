'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import { useAuth } from '@/lib/auth'
import type { SortOrder, RecipeWithIngredients } from '@/types/recipe'

interface UseRecipesOptions {
  searchQuery?: string
  ingredientIds?: string[]
  sortOrder?: SortOrder
}

interface UseRecipesReturn {
  recipes: RecipeWithIngredients[]
  isLoading: boolean
  isPending: boolean
  error: Error | null
  refetch: () => void
}

interface FetchParams {
  lineUserId: string
  searchQuery: string
  ingredientIds: string[]
  sortOrder: SortOrder
}

const DEBOUNCE_MS = 300

async function fetchRecipesApi(params: FetchParams): Promise<RecipeWithIngredients[]> {
  const response = await fetch('/api/recipes/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'レシピの取得に失敗しました')
  return result.data || []
}

export function useRecipes(options: UseRecipesOptions = {}): UseRecipesReturn {
  const { searchQuery = '', ingredientIds = [], sortOrder = 'newest' } = options
  const { user } = useAuth()

  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isPending, startTransition] = useTransition()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const loadRecipes = useCallback(async () => {
    if (!user) {
      setRecipes([])
      setIsInitialLoad(false)
      return
    }
    setError(null)
    try {
      const data = await fetchRecipesApi({ lineUserId: user.lineUserId, searchQuery, ingredientIds, sortOrder })
      if (isMountedRef.current) startTransition(() => { setRecipes(data); setIsInitialLoad(false) })
    } catch (err) {
      if (isMountedRef.current) startTransition(() => { setError(err instanceof Error ? err : new Error('Unknown error')); setIsInitialLoad(false) })
    }
  }, [user, searchQuery, ingredientIds, sortOrder])

  useEffect(() => {
    isMountedRef.current = true
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(loadRecipes, searchQuery ? DEBOUNCE_MS : 0)
    return () => { isMountedRef.current = false; if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [loadRecipes, searchQuery])

  return { recipes, isLoading: isInitialLoad, isPending, error, refetch: loadRecipes }
}
