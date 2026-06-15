'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'

interface UseRecipeActionsOptions {
  recipeId: string
  initialMemo: string | null
}

export function useRecipeActions({ recipeId, initialMemo }: UseRecipeActionsOptions) {
  const { user } = useAuth()
  const authedFetch = useAuthedFetch()
  const [memo, setMemo] = useState(initialMemo)

  const updateMemo = useCallback(async (newMemo: string) => {
    if (!user) throw new Error('認証が必要です')
    const res = await authedFetch(`/api/recipes/${recipeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo: newMemo }),
    })
    if (!res.ok) throw new Error('メモの更新に失敗しました')
    setMemo(newMemo)
  }, [recipeId, user, authedFetch])

  const deleteRecipe = useCallback(async () => {
    if (!user) throw new Error('認証が必要です')
    const res = await authedFetch(`/api/recipes/${recipeId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('削除に失敗しました')
  }, [recipeId, user, authedFetch])

  return { memo, updateMemo, deleteRecipe }
}
