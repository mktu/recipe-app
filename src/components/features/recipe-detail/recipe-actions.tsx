'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ExternalLink, NotebookText, RefreshCw, Loader2 } from 'lucide-react'
import { DeleteDialog } from './delete-dialog'

interface RecipeActionsProps {
  url: string
  /** ノート由来のレシピなら対のノート ID。再取得と外部リンクの出し分けに使う */
  noteId: string | null
  isRescraping: boolean
  onRescrape: () => void
  onDelete: () => Promise<void>
}

export function RecipeActions({ url, noteId, isRescraping, onRescrape, onDelete }: RecipeActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try { await onDelete(); router.push('/') } catch { setIsDeleting(false) }
  }, [onDelete, router])

  return (
    <div className="flex flex-col gap-3">
      {noteId ? (
        <NoteLink noteId={noteId} />
      ) : (
        <>
          <RescrapeButton isRescraping={isRescraping} onRescrape={onRescrape} />
          <Button variant="outline" className="w-full" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />レシピサイトに移動</a>
          </Button>
        </>
      )}
      <DeleteDialog isDeleting={isDeleting} onDelete={handleDelete} />
    </div>
  )
}

/**
 * ノートはアプリ内の保護ページなので同一タブで遷移する。
 * `target="_blank"` だと LINE の内蔵ブラウザでは LIFF の外に出てしまい、認証が通らない。
 * 再取得ボタンも出さない（ノートは外部サイトではないので取り直すものが無い）。
 */
function NoteLink({ noteId }: { noteId: string }) {
  return (
    <Button variant="outline" className="w-full" asChild>
      <Link href={`/notes/${noteId}`}><NotebookText className="mr-2 h-4 w-4" />ノートを開く</Link>
    </Button>
  )
}

function RescrapeButton({ isRescraping, onRescrape }: { isRescraping: boolean; onRescrape: () => void }) {
  return (
    <Button variant="outline" className="w-full" onClick={onRescrape} disabled={isRescraping}>
      {isRescraping ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />取得中...</>
      ) : (
        <><RefreshCw className="mr-2 h-4 w-4" />レシピ情報を再取得</>
      )}
    </Button>
  )
}
