'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/lib/auth'

interface UseRecipeActionsOptions {
  recipeId: string
  initialMemo: string | null
}

export function useRecipeActions({ recipeId, initialMemo }: UseRecipeActionsOptions) {
  const { user } = useAuth()
  const [memo, setMemo] = useState(initialMemo)

  const updateMemo = useCallback(async (newMemo: string) => {
    if (!user) throw new Error('認証が必要です')
    const res = await fetch(`/api/recipes/${recipeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-line-user-id': user.lineUserId,
      },
      body: JSON.stringify({ memo: newMemo }),
    })
    if (!res.ok) throw new Error('メモの更新に失敗しました')
    setMemo(newMemo)
  }, [recipeId, user])

  const deleteRecipe = useCallback(async () => {
    if (!user) throw new Error('認証が必要です')
    const res = await fetch(`/api/recipes/${recipeId}`, {
      method: 'DELETE',
      headers: { 'x-line-user-id': user.lineUserId },
    })
    if (!res.ok) throw new Error('削除に失敗しました')
  }, [recipeId, user])

  return { memo, updateMemo, deleteRecipe }
}
