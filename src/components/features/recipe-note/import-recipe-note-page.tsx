'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CenteredMessage, LoadingState } from '@/components/features/recipe-detail'
import { useAuth } from '@/lib/auth'
import type { ParseWarning } from '@/lib/recipe/note-markdown/types'
import type { RecipeNoteDetail } from '@/types/recipe'
import { MarkdownPasteForm } from './markdown-paste-form'
import { NoteEditor } from './note-editor'
import { ParseWarnings } from './parse-warnings'
import { FormatGuide } from './format-guide'
import { readPastedMarkdown } from './paste-draft'
import { useCreateNote } from './use-create-note'
import type { IngredientOption } from './use-note-form'

interface ImportRecipeNotePageProps {
  /** 材料名のサジェスト元（食材マスタ） */
  ingredients: IngredientOption[]
}

interface Draft { note: RecipeNoteDetail; warnings: ParseWarning[] }

/**
 * 書式に沿ったレシピを貼り付けて、マイレシピをまとめて入力する画面（#178）。
 *
 * 主ルートは LINE のワンパス登録（#208）で、こちらは中身を確かめてから保存したいときの副ルート。
 * LINE と同じく「書式に沿って貼る」機能として見せ、AI は書式の説明で触れるだけにする。
 * 読み取った内容を編集フォームに流し込み、それをプレビューを兼ねた確認画面にする。
 */
export function ImportRecipeNotePage({ ingredients }: ImportRecipeNotePageProps) {
  const createNote = useCreateNote()
  const { isLoading, isAuthenticated } = useAuth()
  const [text, setText] = useState('')
  const [blockingReasons, setBlockingReasons] = useState<string[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)

  const read = () => {
    const result = readPastedMarkdown(text)
    if (result.kind === 'blocked') return setBlockingReasons(result.reasons)
    setBlockingReasons([])
    setDraft({ note: result.note, warnings: result.warnings })
    window.scrollTo(0, 0)
  }

  const changeText = (value: string) => {
    setText(value)
    setBlockingReasons([])
  }

  if (isLoading) return <LoadingState />
  if (!isAuthenticated) return <CenteredMessage>ログインが必要です</CenteredMessage>

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          <ArrowLeft className="mr-1 h-4 w-4" />
          レシピ一覧に戻る
        </Link>
      </Button>
      {draft ? (
        <>
          <ParseWarnings warnings={draft.warnings} />
          {/* キャンセルは貼り付けに戻る。貼った文はそのまま残す */}
          <NoteEditor heading="内容を確かめて保存" note={draft.note} ingredients={ingredients} onSave={createNote} onCancel={() => setDraft(null)} />
        </>
      ) : (
        <>
          <div className="space-y-1">
            <h1 className="text-lg font-bold">書式に沿って貼り付ける</h1>
            <p className="text-sm text-muted-foreground">書式に沿ったレシピを貼り付けると、材料や手順をまとめて入力できます。</p>
          </div>
          <FormatGuide />
          <MarkdownPasteForm value={text} onChange={changeText} onSubmit={read} blockingReasons={blockingReasons} />
        </>
      )}
    </div>
  )
}
