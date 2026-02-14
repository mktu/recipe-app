'use client'

import useSWR from 'swr'
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

async function fetchRecipesApi(params: FetchParams): Promise<RecipeWithIngredients[]> {
  const t = Date.now()
  console.log('[useRecipes] API呼び出し開始')
  const response = await fetch('/api/recipes/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const result = await response.json()
  console.log('[useRecipes] API呼び出し完了:', Date.now() - t, 'ms')
  if (!response.ok) throw new Error(result.error || 'レシピの取得に失敗しました')
  return result.data || []
}

export function useRecipes(options: UseRecipesOptions = {}): UseRecipesReturn {
  const { searchQuery = '', ingredientIds = [], sortOrder = 'newest' } = options
  const { user } = useAuth()

  // SWRのキーを生成（userがいない場合はnullでフェッチをスキップ）
  const swrKey = user
    ? ['recipes', user.lineUserId, searchQuery, ingredientIds.join(','), sortOrder]
    : null

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    () => fetchRecipesApi({
      lineUserId: user!.lineUserId,
      searchQuery,
      ingredientIds,
      sortOrder,
    }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300, // 300ms以内の同一リクエストは重複排除
    }
  )

  return {
    recipes: data ?? [],
    isLoading,
    isPending: isValidating,
    error: error ?? null,
    refetch: () => mutate(),
  }
}
