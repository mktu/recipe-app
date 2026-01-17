'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
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
  isLoading: boolean   // 初回ロード中
  isPending: boolean   // リフェッチ中（useTransition）
  error: Error | null
  refetch: () => void
}

const DEBOUNCE_MS = 300

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

    const { data, error: fetchError } = await fetchRecipes({
      userId: user.lineUserId,
      searchQuery,
      ingredientIds,
      sortOrder,
    })

    if (isMountedRef.current) {
      // startTransitionで状態更新をラップし、UIのブロックを防ぐ
      startTransition(() => {
        setRecipes(data)
        setError(fetchError)
        setIsInitialLoad(false)
      })
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

  // isLoading: 初回ロード中のみtrue（スケルトン表示用）
  // isPending: リフェッチ中（控えめなインジケーター用、または無視）
  return { recipes, isLoading: isInitialLoad, isPending, error, refetch: loadRecipes }
}
