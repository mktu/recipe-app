'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { RecipeDetail } from '@/types/recipe'
import { RecipeDetailPage } from './recipe-detail-page'

interface RecipeDetailWrapperProps {
  recipeId: string
}

export function RecipeDetailWrapper({ recipeId }: RecipeDetailWrapperProps) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecipe = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        headers: { 'x-line-user-id': user.lineUserId },
      })
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
  }, [recipeId, user])

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

function LoadingState() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      <div className="aspect-video animate-pulse rounded-xl bg-muted" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}
