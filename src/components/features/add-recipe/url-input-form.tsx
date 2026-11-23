'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { isOwnAppUrl } from '@/lib/recipe/own-app-url'

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** 確認画面へ進む前の入力チェック。問題が無ければ null */
function validateUrl(url: string): string | null {
  if (!url) return 'URLを入力してください'
  if (!isValidUrl(url)) return '有効なURLを入力してください'
  // アプリ自身のページは取得しても中身が取れない（#230）
  if (isOwnAppUrl(url)) return 'RecipeHub のページは登録できません'
  return null
}

interface UrlInputFormProps {
  initialUrl?: string
  /** 確認画面で取得できず戻されたときのエラー（#242） */
  initialError?: string | null
}

export function UrlInputForm({ initialUrl = '', initialError = null }: UrlInputFormProps) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(initialError)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      // エラーは送信時でなく入力時に消す。同じ URL で戻されたとき state が残り、消すとエラーが出ない（#242）
      const trimmedUrl = url.trim()
      const validationError = validateUrl(trimmedUrl)
      if (validationError) {
        setError(validationError)
        return
      }
      router.push(`/recipes/add/confirm?url=${encodeURIComponent(trimmedUrl)}`)
    },
    [url, router]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {/* 可視ラベルは親の見出し「レシピのURLを入力」なので、input 自身には名前が無い。
              aria-label が無いとスクリーンリーダーは placeholder の URL 例を読み上げてしまう */}
          <Input
            type="url"
            aria-label="レシピのURL"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError(null)
            }}
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
