'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import type { RecipeDetail } from '@/types/recipe'
import { RecipeDetailPage } from './recipe-detail-page'
import { CenteredMessage, LoadingState } from './page-states'

interface RecipeDetailWrapperProps {
  recipeId: string
}

/**
 * レシピ詳細の取得と表示。
 *
 * マイレシピはノート画面で見る・直すので、履歴や古いリンクからここに来たらノートへ転送する（#226）。
 * 判定は `url` ではなく `noteId`（`recipe_notes.recipe_id` の FK）で行う。
 */
export function RecipeDetailWrapper({ recipeId }: RecipeDetailWrapperProps) {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const authedFetch = useAuthedFetch()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // recipeId が変わったときの状態リセットはページ側の key で再マウントして行う
  const fetchRecipe = useCallback(async () => {
    if (!user) return
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

  // 編集後の取り直し。effect から呼ぶ fetchRecipe と分けて、同期の setState を effect に持ち込まない
  const refetchRecipe = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    await fetchRecipe()
  }, [fetchRecipe])

  useEffect(() => {
    if (authLoading || !user) return
    // fetchRecipe の setState は await の後だけだが、ルールは非同期の境界を見ずに検出する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipe()
  }, [authLoading, user, fetchRecipe])

  const noteId = recipe?.noteId
  useEffect(() => {
    if (noteId) router.replace(`/notes/${noteId}`)
  }, [noteId, router])

  // 転送中は詳細画面を一瞬でも出さない
  if (authLoading || isLoading || noteId) return <LoadingState />
  if (!isAuthenticated) return <CenteredMessage>ログインが必要です</CenteredMessage>
  if (error) return <CenteredMessage>{error}</CenteredMessage>
  if (!recipe) return <CenteredMessage>レシピが見つかりません</CenteredMessage>

  return <RecipeDetailPage recipe={recipe} onRecipeUpdated={refetchRecipe} />
}
