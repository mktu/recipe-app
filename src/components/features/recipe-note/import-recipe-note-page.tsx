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
import { PromptCopy } from './prompt-copy'
import { readPastedMarkdown } from './paste-draft'
import { useCreateNote } from './use-create-note'
import type { IngredientOption } from './use-note-form'

interface ImportRecipeNotePageProps {
  /** 材料名のサジェスト元（食材マスタ） */
  ingredients: IngredientOption[]
}

interface Draft { note: RecipeNoteDetail; warnings: ParseWarning[] }

/**
 * AI が書いたレシピの Markdown を貼り付けてマイレシピにする画面（#178）。
 *
 * 主ルートは LINE のワンパス登録（#208）で、こちらは中身を確かめてから保存したいときの副ルート。
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
          <h1 className="text-lg font-bold">AI のレシピを貼り付ける</h1>
          <PromptCopy />
          <MarkdownPasteForm value={text} onChange={changeText} onSubmit={read} blockingReasons={blockingReasons} />
        </>
      )}
    </div>
  )
}
