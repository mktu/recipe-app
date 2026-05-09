'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SortOrder, IngredientsByCategory } from '@/types/recipe'

export interface RecipeFiltersState {
  searchQuery: string
  selectedIngredientIds: string[]
  selectedSourceNames: string[]
  sortOrder: SortOrder
  hasFilters: boolean
  ingredientNameMap: Map<string, string>
}

export interface RecipeFiltersActions {
  setSearchQuery: (query: string) => void
  setSelectedIngredientIds: (ids: string[]) => void
  setSelectedSourceNames: (names: string[]) => void
  toggleSourceName: (name: string) => void
  setSortOrder: (order: SortOrder) => void
  removeIngredient: (id: string) => void
  removeSourceName: (name: string) => void
  clearFilters: () => void
}

export interface InitialFilters {
  searchQuery: string
  ingredientIds: string[]
  sourceNames?: string[]
  sortOrder?: SortOrder
}

function resolveInitialFilters(f?: InitialFilters) {
  return {
    searchQuery: f?.searchQuery ?? '',
    ingredientIds: f?.ingredientIds ?? [],
    sourceNames: f?.sourceNames ?? [],
    sortOrder: f?.sortOrder ?? 'newest' as SortOrder,
  }
}

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]
}

function buildIngredientNameMap(categories: IngredientsByCategory[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const group of categories) {
    for (const ing of group.ingredients) {
      map.set(ing.id, ing.name)
    }
  }
  return map
}

export function useRecipeFilters(
  ingredientsByCategory: IngredientsByCategory[],
  initialFilters?: InitialFilters
): RecipeFiltersState & RecipeFiltersActions {
  const defaults = resolveInitialFilters(initialFilters)
  const [searchQuery, setSearchQuery] = useState(defaults.searchQuery)
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(defaults.ingredientIds)
  const [selectedSourceNames, setSelectedSourceNames] = useState<string[]>(defaults.sourceNames)
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaults.sortOrder)

  const ingredientNameMap = useMemo(() => buildIngredientNameMap(ingredientsByCategory), [ingredientsByCategory])

  const hasFilters = searchQuery !== '' || selectedIngredientIds.length > 0 || selectedSourceNames.length > 0

  const removeIngredient = useCallback((id: string) => {
    setSelectedIngredientIds((prev) => prev.filter((i) => i !== id))
  }, [])

  const toggleSourceName = useCallback((name: string) => {
    setSelectedSourceNames((prev) => toggleArrayItem(prev, name))
  }, [])

  const removeSourceName = useCallback((name: string) => {
    setSelectedSourceNames((prev) => prev.filter((n) => n !== name))
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedIngredientIds([])
    setSelectedSourceNames([])
  }, [])

  return {
    searchQuery,
    selectedIngredientIds,
    selectedSourceNames,
    sortOrder,
    hasFilters,
    ingredientNameMap,
    setSearchQuery,
    setSelectedIngredientIds,
    setSelectedSourceNames,
    toggleSourceName,
    setSortOrder,
    removeIngredient,
    removeSourceName,
    clearFilters,
  }
}
