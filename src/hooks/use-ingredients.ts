'use client'

import { useState, useEffect, useRef } from 'react'
import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import type { IngredientsByCategory } from '@/types/recipe'

interface UseIngredientsReturn {
  ingredientsByCategory: IngredientsByCategory[]
  isLoading: boolean
  error: Error | null
}

export function useIngredients(): UseIngredientsReturn {
  const [ingredientsByCategory, setIngredientsByCategory] = useState<IngredientsByCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    // 一度だけ取得（食材マスターは変更されにくい）
    if (hasFetched.current) return
    hasFetched.current = true

    const load = async () => {
      const { data, error: fetchError } = await fetchIngredientsByCategory()
      setIngredientsByCategory(data)
      setError(fetchError)
      setIsLoading(false)
    }

    load()
  }, [])

  return { ingredientsByCategory, isLoading, error }
}
