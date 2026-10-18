'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import type { RecipeNoteFields } from '@/types/recipe'

/**
 * ノートを新規作成する（POST /api/notes）。手で書く画面（#175）と Markdown の貼り付け（#178）で共有する。
 *
 * 保存後は作ったノートへ置き換えで遷移する（戻るで入力画面に戻って二重に作らないため）。
 */
export function useCreateNote() {
  const router = useRouter()
  const authedFetch = useAuthedFetch()

  return useCallback(async (fields: RecipeNoteFields) => {
    const res = await authedFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(res.status === 400 && body?.error ? body.error : 'マイレシピの保存に失敗しました')
    }
    router.replace(`/notes/${body.noteId}`)
  }, [authedFetch, router])
}
