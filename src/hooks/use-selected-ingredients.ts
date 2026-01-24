'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/db/client'
import type { Ingredient } from '@/types/recipe'

interface UseSelectedIngredientsReturn {
  ingredients: Map<string, Ingredient>
  isLoading: boolean
}

/**
 * 選択されたIDから食材情報を取得するフック
 * needs_review関係なく取得する
 */
export function useSelectedIngredients(ids: string[]): UseSelectedIngredientsReturn {
  const [ingredientList, setIngredientList] = useState<Ingredient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const fetchedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (ids.length === 0) return

    // 未取得のIDのみフェッチ
    const missingIds = ids.filter((id) => !fetchedIds.current.has(id))
    if (missingIds.length === 0) return

    const fetchMissing = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, category')
        .in('id', missingIds)

      if (!error && data) {
        const fetched = data as unknown as Ingredient[]
        for (const ing of fetched) {
          fetchedIds.current.add(ing.id)
        }
        setIngredientList((prev) => [...prev, ...fetched])
      }
      setIsLoading(false)
    }

    fetchMissing()
  }, [ids])

  const ingredients = useMemo(() => {
    const map = new Map<string, Ingredient>()
    for (const ing of ingredientList) {
      map.set(ing.id, ing)
    }
    return map
  }, [ingredientList])

  return { ingredients, isLoading }
}
