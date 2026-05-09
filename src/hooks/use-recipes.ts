'use client'

import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import type { SortOrder, RecipeWithIngredients } from '@/types/recipe'

interface UseRecipesOptions {
  searchQuery?: string
  ingredientIds?: string[]
  sourceNames?: string[]
  sortOrder?: SortOrder
}

interface UseRecipesReturn {
  recipes: RecipeWithIngredients[]
  availableSourceNames: string[]
  isLoading: boolean
  isPending: boolean
  error: Error | null
  refetch: () => void
}

interface FetchParams {
  lineUserId: string
  searchQuery: string
  ingredientIds: string[]
  sourceNames: string[]
  sortOrder: SortOrder
}

interface FetchResult {
  data: RecipeWithIngredients[]
  availableSourceNames: string[]
}

const EMPTY_RESULT: FetchResult = { data: [], availableSourceNames: [] }

async function fetchRecipesApi(params: FetchParams): Promise<FetchResult> {
  const response = await fetch('/api/recipes/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'レシピの取得に失敗しました')
  return {
    data: result.data || [],
    availableSourceNames: result.availableSourceNames || [],
  }
}

function buildSwrKey(
  lineUserId: string, searchQuery: string, ingredientIds: string[], sourceNames: string[], sortOrder: SortOrder
) {
  return ['recipes', lineUserId, searchQuery, ingredientIds.join(','), sourceNames.join(','), sortOrder]
}

export function useRecipes(options: UseRecipesOptions = {}): UseRecipesReturn {
  const { searchQuery = '', ingredientIds = [], sourceNames = [], sortOrder = 'newest' } = options
  const { user } = useAuth()

  const swrKey = user ? buildSwrKey(user.lineUserId, searchQuery, ingredientIds, sourceNames, sortOrder) : null

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    () => fetchRecipesApi({
      lineUserId: user!.lineUserId,
      searchQuery,
      ingredientIds,
      sourceNames,
      sortOrder,
    }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300,
      keepPreviousData: true,
    }
  )

  const result = data ?? EMPTY_RESULT

  return {
    recipes: result.data,
    availableSourceNames: result.availableSourceNames,
    isLoading,
    isPending: isValidating,
    error: error ?? null,
    refetch: () => mutate(),
  }
}
