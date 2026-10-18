'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CenteredMessage, LoadingState, RecipeDeleteButton } from '@/components/features/recipe-detail'
import { NoteEditor } from './note-editor'
import { NoteView } from './note-view'
import { useRecipeNote } from './use-recipe-note'
import { useTrackLineView } from './use-track-line-view'
import type { IngredientOption } from './use-note-form'

interface RecipeNotePageProps {
  noteId: string
  /** 材料名のサジェスト元（食材マスタ） */
  ingredients: IngredientOption[]
  /** LINE のカードから開かれた（`?from=line`）。閲覧をここで記録する */
  fromLine: boolean
}

/**
 * レシピノートの閲覧・編集画面（Issue #176）。
 *
 * 一覧のカードからも LINE のカードからも直接ここに着地するので（#226）、
 * 戻り先は履歴ではなく一覧に固定する。
 * 削除もここで行う。マイレシピは詳細画面を経由しないため、ここに無いと消す手段が無くなる。
 */
export function RecipeNotePage({ noteId, ingredients, fromLine }: RecipeNotePageProps) {
  const { note, isLoading, isAuthenticated, error, saveNote } = useRecipeNote(noteId)
  const [isEditing, setIsEditing] = useState(false)
  useTrackLineView(fromLine, note?.recipeId)

  if (isLoading) return <LoadingState />
  if (!isAuthenticated) return <CenteredMessage>ログインが必要です</CenteredMessage>
  if (error) return <CenteredMessage>{error}</CenteredMessage>
  if (!note) return <CenteredMessage>マイレシピが見つかりません</CenteredMessage>

  return (
    <div className="mx-auto max-w-lg p-4">
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link href="/">
          <ArrowLeft className="mr-1 h-4 w-4" />
          レシピ一覧に戻る
        </Link>
      </Button>
      {isEditing ? (
        <NoteEditor
          heading="マイレシピを編集"
          note={note}
          ingredients={ingredients}
          onSave={async (fields) => { await saveNote(fields); setIsEditing(false) }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="space-y-3">
          <NoteView note={note} onEdit={() => setIsEditing(true)} />
          {/* 図鑑に出ていないノート（将来のアレンジ用。Epic #172）は消す対象のレシピ行が無い */}
          {note.recipeId && <RecipeDeleteButton recipeId={note.recipeId} label="マイレシピ" />}
        </div>
      )}
    </div>
  )
}
