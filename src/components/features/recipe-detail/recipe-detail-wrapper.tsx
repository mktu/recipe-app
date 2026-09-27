'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import type { RecipeDetail } from '@/types/recipe'
import { RecipeDetailPage } from './recipe-detail-page'
import { CenteredMessage, LoadingState } from './page-states'

interface RecipeDetailWrapperProps {
  recipeId: string
}

export function RecipeDetailWrapper({ recipeId }: RecipeDetailWrapperProps) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const authedFetch = useAuthedFetch()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecipe = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await authedFetch(`/api/recipes/${recipeId}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'レシピが見つかりません' : 'レシピの取得に失敗しました')
        return
      }
      setRecipe(await res.json())
    } catch {
      setError('レシピの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [recipeId, user, authedFetch])

  useEffect(() => {
    if (authLoading || !user) return
    fetchRecipe()
  }, [authLoading, user, fetchRecipe])

  if (authLoading || isLoading) return <LoadingState />
  if (!isAuthenticated) return <CenteredMessage>ログインが必要です</CenteredMessage>
  if (error) return <CenteredMessage>{error}</CenteredMessage>
  if (!recipe) return <CenteredMessage>レシピが見つかりません</CenteredMessage>

  return <RecipeDetailPage recipe={recipe} onRecipeUpdated={fetchRecipe} />
}
