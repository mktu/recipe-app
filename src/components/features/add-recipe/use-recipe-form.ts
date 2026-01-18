import { useState, useCallback } from 'react'
import type { ParsedRecipe } from '@/types/recipe'

export interface RecipeFormData {
  title: string
  sourceName: string
  imageUrl: string
  ingredientIds: string[]
  memo: string
}

interface UseRecipeFormOptions {
  initialValues?: Partial<ParsedRecipe>
  onSubmit: (data: RecipeFormData) => Promise<void>
}

function getInitialValue<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue
}

export function useRecipeForm({ initialValues, onSubmit }: UseRecipeFormOptions) {
  const [title, setTitle] = useState(getInitialValue(initialValues?.title, ''))
  const [sourceName, setSourceName] = useState(getInitialValue(initialValues?.sourceName, ''))
  const [imageUrl, setImageUrl] = useState(getInitialValue(initialValues?.imageUrl, ''))
  const [ingredientIds, setIngredientIds] = useState<string[]>(getInitialValue(initialValues?.ingredientIds, []))
  const [memo, setMemo] = useState(getInitialValue(initialValues?.memo, ''))
  const [error, setError] = useState<string | null>(null)

  const validateAndSubmit = useCallback(async (data: RecipeFormData) => {
    if (!data.title.trim()) {
      setError('タイトルを入力してください')
      return
    }
    await onSubmit({ ...data, title: data.title.trim() })
  }, [onSubmit])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    await validateAndSubmit({ title, sourceName, imageUrl, ingredientIds, memo })
  }, [title, sourceName, imageUrl, ingredientIds, memo, validateAndSubmit])

  return {
    values: { title, sourceName, imageUrl, ingredientIds, memo },
    setters: { setTitle, setSourceName, setImageUrl, setIngredientIds, setMemo },
    error,
    handleSubmit,
  }
}
