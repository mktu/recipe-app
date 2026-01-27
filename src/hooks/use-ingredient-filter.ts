'use client'

import { useState, useCallback, useMemo } from 'react'
import { useIngredientHistory } from './use-ingredient-history'
import type { IngredientsByCategory } from '@/types/recipe'

interface UseIngredientFilterProps {
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function useIngredientFilter({ categories, selectedIds, onSelectionChange }: UseIngredientFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { history, addToHistory } = useIngredientHistory()

  const allIngredients = useMemo(
    () => categories.flatMap((cat) => cat.ingredients),
    [categories]
  )

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return allIngredients.filter((ing) => ing.name.toLowerCase().includes(query) && !selectedSet.has(ing.id))
  }, [allIngredients, searchQuery, selectedSet])

  const validHistory = useMemo(() => {
    const idSet = new Set(allIngredients.map((i) => i.id))
    return history.filter((h) => idSet.has(h.id) && !selectedSet.has(h.id))
  }, [history, allIngredients, selectedSet])

  const selectedIngredients = useMemo(
    () => allIngredients.filter((ing) => selectedIds.includes(ing.id)),
    [allIngredients, selectedIds]
  )

  const toggleIngredient = useCallback(
    (ingredient: { id: string; name: string }) => {
      const isSelected = selectedIds.includes(ingredient.id)
      const newIds = isSelected ? selectedIds.filter((i) => i !== ingredient.id) : [...selectedIds, ingredient.id]
      if (!isSelected) {
        addToHistory({ id: ingredient.id, name: ingredient.name })
        setSearchQuery('')
      }
      onSelectionChange(newIds)
    },
    [selectedIds, onSelectionChange, addToHistory]
  )

  return {
    searchQuery,
    setSearchQuery,
    filteredIngredients,
    validHistory,
    selectedIngredients,
    selectedIds,
    toggleIngredient,
    clearSelection: useCallback(() => onSelectionChange([]), [onSelectionChange]),
  }
}
