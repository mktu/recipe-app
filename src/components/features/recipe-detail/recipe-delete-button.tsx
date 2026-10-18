'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import { DeleteDialog } from './delete-dialog'

interface RecipeDeleteButtonProps {
  recipeId: string
  /** ボタンと確認文に出す呼び名（ブックマークは「レシピ」、ノートは「マイレシピ」） */
  label: string
}

/**
 * レシピ行を削除して一覧に戻る。
 *
 * マイレシピも対のレシピ行を消せば FK の CASCADE でノートごと消えるので、
 * 詳細画面とノート画面で同じものを使う（#226）。
 * 戻ったときに削除済みの画面へ戻らないよう、履歴は置き換える。
 */
export function RecipeDeleteButton({ recipeId, label }: RecipeDeleteButtonProps) {
  const router = useRouter()
  const authedFetch = useAuthedFetch()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      const res = await authedFetch(`/api/recipes/${recipeId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      router.replace('/')
    } catch {
      setIsDeleting(false)
    }
  }, [recipeId, authedFetch, router])

  return <DeleteDialog label={label} isDeleting={isDeleting} onDelete={handleDelete} />
}
