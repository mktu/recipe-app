'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function UrlInputForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      const trimmedUrl = url.trim()
      if (!trimmedUrl) {
        setError('URLを入力してください')
        return
      }

      if (!isValidUrl(trimmedUrl)) {
        setError('有効なURLを入力してください')
        return
      }

      // 確認画面へ遷移
      router.push(`/recipes/add/confirm?url=${encodeURIComponent(trimmedUrl)}`)
    },
    [url, router]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://cookpad.com/recipe/..."
            className="pl-9"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" className="w-full">
        次へ
      </Button>
    </form>
  )
}
