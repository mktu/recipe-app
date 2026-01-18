'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { UrlInputForm } from './url-input-form'

export function UrlInputPage() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuth()

  const handleBack = useCallback(() => {
    router.push('/')
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">ログインが必要です</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">レシピを追加</h1>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-medium">レシピのURLを入力</h2>
            <p className="text-sm text-muted-foreground">
              クックパッドやデリッシュキッチンなど、レシピサイトのURLを入力してください
            </p>
          </div>
          <UrlInputForm />
        </div>
      </main>
    </div>
  )
}
