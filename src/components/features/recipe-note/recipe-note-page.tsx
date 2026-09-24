'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CenteredMessage, LoadingState } from '@/components/features/recipe-detail'
import { NoteEditor } from './note-editor'
import { NoteView } from './note-view'
import { useRecipeNote } from './use-recipe-note'

interface RecipeNotePageProps {
  noteId: string
}

/**
 * レシピノートの閲覧・編集画面（Issue #176）。
 *
 * LINE のカードからは閲覧記録のリダイレクト経由でここに直接着地するので、
 * 戻り先は履歴ではなく図鑑の詳細画面に固定する。
 */
export function RecipeNotePage({ noteId }: RecipeNotePageProps) {
  const { note, isLoading, isAuthenticated, error, saveNote } = useRecipeNote(noteId)
  const [isEditing, setIsEditing] = useState(false)

  if (isLoading) return <LoadingState />
  if (!isAuthenticated) return <CenteredMessage>ログインが必要です</CenteredMessage>
  if (error) return <CenteredMessage>{error}</CenteredMessage>
  if (!note) return <CenteredMessage>ノートが見つかりません</CenteredMessage>

  const backHref = note.recipeId ? `/recipes/${note.recipeId}` : '/'

  return (
    <div className="mx-auto max-w-lg p-4">
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {note.recipeId ? 'レシピ詳細に戻る' : 'レシピ一覧に戻る'}
        </Link>
      </Button>
      {isEditing ? (
        <NoteEditor
          note={note}
          onSave={async (fields) => { await saveNote(fields); setIsEditing(false) }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <NoteView note={note} onEdit={() => setIsEditing(true)} />
      )}
    </div>
  )
}
