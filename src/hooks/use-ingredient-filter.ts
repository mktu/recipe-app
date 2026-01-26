'use client'

import { useState, useCallback, useMemo } from 'react'
import { useIngredients } from './use-ingredients'
import { useIngredientHistory } from './use-ingredient-history'

interface UseIngredientFilterProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function useIngredientFilter({ selectedIds, onSelectionChange }: UseIngredientFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { ingredientsByCategory, isLoading } = useIngredients()
  const { history, addToHistory } = useIngredientHistory()

  const allIngredients = useMemo(
    () => ingredientsByCategory.flatMap((cat) => cat.ingredients),
    [ingredientsByCategory]
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
    isLoading,
    filteredIngredients,
    validHistory,
    selectedIngredients,
    toggleIngredient,
    clearSelection: useCallback(() => onSelectionChange([]), [onSelectionChange]),
  }
}
