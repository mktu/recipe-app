'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RECIPE_NOTE_PROMPT } from '@/lib/recipe/note-markdown/prompt'

type CopyState = 'idle' | 'copied' | 'failed'

/** 「コピーしました」を出しておく時間。戻さないと2回目に押しても反応が分からない */
const COPIED_MS = 2000

/**
 * 書式を見せてコピーさせる（#178）。LINE の「書式を見る」（#201）と同じ立ち位置。
 *
 * 文面は LINE と共通の `RECIPE_NOTE_PROMPT`（#214）。ここで書き換えたり別の文面を持ったりしない。
 * 「AI」は見出しやボタンに出さず、説明で触れるだけにする（アプリが AI でレシピを作るように読めるため。LINE と揃える）。
 * Clipboard API が使えない環境（権限の無い WebView など）もあるので、文面は常に選択できる形で出しておく。
 */
export function FormatGuide() {
  const [state, setState] = useState<CopyState>('idle')
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const copy = async () => {
    clearTimeout(timerRef.current)
    try {
      await navigator.clipboard.writeText(RECIPE_NOTE_PROMPT)
      setState('copied')
      timerRef.current = setTimeout(() => setState('idle'), COPIED_MS)
    } catch {
      setState('failed')
      // 開閉を状態に結び付けると、次に成功したときに畳まれる。失敗したときに開くだけにする
      if (detailsRef.current) detailsRef.current.open = true
    }
  }

  return (
    <details ref={detailsRef} className="rounded-md border text-sm">
      <summary className="cursor-pointer px-3 py-2 font-medium">書式を見る</summary>
      <div className="space-y-2 border-t px-3 py-2">
        <p className="text-muted-foreground">自分で書くときは、下の「例」の形で書いてください。</p>
        <p className="text-muted-foreground">
          ChatGPT などで考えたレシピを入れるときは、この書式をそのまま AI に渡すと、この形で書いてくれます。
        </p>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {state === 'copied' ? <Check aria-hidden className="mr-1 h-4 w-4" /> : <Copy aria-hidden className="mr-1 h-4 w-4" />}
          {state === 'copied' ? 'コピーしました' : '書式をコピー'}
        </Button>
        {state === 'failed' && (
          <p role="alert" className="text-destructive">コピーできませんでした。下の書式を選択してコピーしてください。</p>
        )}
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-muted px-3 py-2 text-xs">
          {RECIPE_NOTE_PROMPT}
        </pre>
      </div>
    </details>
  )
}
