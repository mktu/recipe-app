'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { DeleteDialog } from './delete-dialog'

interface RecipeActionsProps {
  url: string
  isRescraping: boolean
  onRescrape: () => void
  onDelete: () => Promise<void>
}

export function RecipeActions({ url, isRescraping, onRescrape, onDelete }: RecipeActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try { await onDelete(); router.push('/') } catch { setIsDeleting(false) }
  }, [onDelete, router])

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="w-full" onClick={onRescrape} disabled={isRescraping}>
        {isRescraping ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />取得中...</>
        ) : (
          <><RefreshCw className="mr-2 h-4 w-4" />レシピ情報を再取得</>
        )}
      </Button>
      <Button variant="outline" className="w-full" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />レシピサイトに移動</a>
      </Button>
      <DeleteDialog isDeleting={isDeleting} onDelete={handleDelete} />
    </div>
  )
}
