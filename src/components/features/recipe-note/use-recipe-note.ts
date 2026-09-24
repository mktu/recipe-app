'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import type { RecipeNoteDetail, RecipeNoteFields } from '@/types/recipe'

/** ノートの取得と保存。保存が成功したら取り直して、図鑑側に書き戻された値（画像 URL 等）を反映する */
export function useRecipeNote(noteId: string) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const authedFetch = useAuthedFetch()
  const [note, setNote] = useState<RecipeNoteDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNote = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await authedFetch(`/api/notes/${noteId}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'ノートが見つかりません' : 'ノートの取得に失敗しました')
        return
      }
      setNote(await res.json())
    } catch {
      setError('ノートの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [noteId, user, authedFetch])

  useEffect(() => {
    if (authLoading || !user) return
    fetchNote()
  }, [authLoading, user, fetchNote])

  const saveNote = useCallback(async (fields: RecipeNoteFields) => {
    const res = await authedFetch(`/api/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(res.status === 400 && body?.error ? body.error : 'ノートの保存に失敗しました')
    }
    // 取得中の表示に切り替えると編集フォームが一瞬消えるので、読み込み状態は触らずに取り直す
    const updated = await authedFetch(`/api/notes/${noteId}`)
    if (updated.ok) setNote(await updated.json())
  }, [noteId, authedFetch])

  return { note, isLoading: authLoading || isLoading, isAuthenticated, error, saveNote }
}
