'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CenteredMessage, LoadingState } from '@/components/features/recipe-detail'
import { useAuth } from '@/lib/auth'
import { NoteEditor } from './note-editor'
import { useCreateNote } from './use-create-note'
import type { IngredientOption } from './use-note-form'

interface NewRecipeNotePageProps {
  /** 材料名のサジェスト元（食材マスタ） */
  ingredients: IngredientOption[]
}

/**
 * レシピノートの新規作成画面（Issue #175）。保存すると図鑑にもレシピ行が作られる。
 */
export function NewRecipeNotePage({ ingredients }: NewRecipeNotePageProps) {
  const router = useRouter()
  const createNote = useCreateNote()
  const { isLoading, isAuthenticated } = useAuth()

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
        heading="マイレシピを書く"
        ingredients={ingredients}
        onSave={createNote}
        onCancel={() => router.push('/')}
      />
    </div>
  )
}
