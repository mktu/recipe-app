'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth'

function useAccountDelete() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!user?.lineUserId) return
    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: user.lineUserId }),
      })
      if (!res.ok) throw new Error('削除に失敗しました')
      await logout()
      router.replace('/')
    } catch {
      setError('アカウントの削除に失敗しました。しばらく経ってから再度お試しください。')
      setIsDeleting(false)
    }
  }

  return { isDeleting, error, handleDelete }
}

interface DeleteDialogProps {
  isDeleting: boolean
  onDelete: () => void
}

function DeleteDialog({ isDeleting, onDelete }: DeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isDeleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? '削除中...' : 'アカウントを削除'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            すべてのレシピデータが完全に削除されます。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function AccountDeleteSection() {
  const { isDeleting, error, handleDelete } = useAccountDelete()

  return (
    <section className="rounded-lg border border-destructive/30 p-4">
      <h2 className="mb-1 text-sm font-semibold text-destructive">危険な操作</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        アカウントを削除すると、すべてのレシピデータも完全に削除されます。この操作は取り消せません。
      </p>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <DeleteDialog isDeleting={isDeleting} onDelete={handleDelete} />
    </section>
  )
}
