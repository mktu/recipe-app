'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ExternalLink, Trash2 } from 'lucide-react'

interface RecipeActionsProps {
  url: string
  onDelete: () => Promise<void>
}

export function RecipeActions({ url, onDelete }: RecipeActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      await onDelete()
      router.push('/')
    } catch {
      setIsDeleting(false)
    }
  }, [onDelete, router])

  return (
    <div className="flex flex-col gap-3">
      {/* 元サイトへのリンク */}
      <Button variant="outline" className="w-full" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          元のレシピを見る
        </a>
      </Button>

      {/* 削除ボタン */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full" disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? '削除中...' : 'レシピを削除'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>レシピを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。レシピは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
