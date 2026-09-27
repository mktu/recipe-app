'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CenteredMessage, LoadingState } from '@/components/features/recipe-detail'
import { useAuth } from '@/lib/auth'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import type { RecipeNoteFields } from '@/types/recipe'
import { NoteEditor } from './note-editor'
import type { IngredientOption } from './use-note-form'

interface NewRecipeNotePageProps {
  /** 材料名のサジェスト元（食材マスタ） */
  ingredients: IngredientOption[]
}

/**
 * レシピノートの新規作成画面（Issue #175）。保存すると図鑑にもレシピ行が作られる。
 *
 * 保存後は作ったノートへ置き換えで遷移する（戻るで空のフォームに戻って二重に作らないため）。
 */
export function NewRecipeNotePage({ ingredients }: NewRecipeNotePageProps) {
  const router = useRouter()
  const authedFetch = useAuthedFetch()
  const { isLoading, isAuthenticated } = useAuth()

  const createNote = useCallback(async (fields: RecipeNoteFields) => {
    const res = await authedFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(res.status === 400 && body?.error ? body.error : 'ノートの保存に失敗しました')
    }
    router.replace(`/notes/${body.noteId}`)
  }, [authedFetch, router])

  if (isLoading) return <LoadingState />
  if (!isAuthenticated) return <CenteredMessage>ログインが必要です</CenteredMessage>

  return (
    <div className="mx-auto max-w-lg p-4">
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link href="/">
          <ArrowLeft className="mr-1 h-4 w-4" />
          レシピ一覧に戻る
        </Link>
      </Button>
      <NoteEditor
        heading="ノートを書く"
        ingredients={ingredients}
        onSave={createNote}
        onCancel={() => router.push('/')}
      />
    </div>
  )
}
