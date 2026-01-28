'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SortOrder, IngredientsByCategory } from '@/types/recipe'

export interface RecipeFiltersState {
  searchQuery: string
  selectedIngredientIds: string[]
  sortOrder: SortOrder
  hasFilters: boolean
  ingredientNameMap: Map<string, string>
}

export interface RecipeFiltersActions {
  setSearchQuery: (query: string) => void
  setSelectedIngredientIds: (ids: string[]) => void
  setSortOrder: (order: SortOrder) => void
  removeIngredient: (id: string) => void
  clearFilters: () => void
}

export function useRecipeFilters(
  ingredientsByCategory: IngredientsByCategory[]
): RecipeFiltersState & RecipeFiltersActions {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const ingredientNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of ingredientsByCategory) {
      for (const ing of group.ingredients) {
        map.set(ing.id, ing.name)
      }
    }
    return map
  }, [ingredientsByCategory])

  const hasFilters = searchQuery !== '' || selectedIngredientIds.length > 0

  const removeIngredient = useCallback((id: string) => {
    setSelectedIngredientIds((prev) => prev.filter((i) => i !== id))
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedIngredientIds([])
  }, [])

  return {
    searchQuery,
    selectedIngredientIds,
    sortOrder,
    hasFilters,
    ingredientNameMap,
    setSearchQuery,
    setSelectedIngredientIds,
    setSortOrder,
    removeIngredient,
    clearFilters,
  }
}
