'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RECIPE_NOTE_PROMPT } from '@/lib/recipe/note-markdown/prompt'

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * AI に渡すプロンプトを見せてコピーさせる（#178）。
 *
 * 文面は LINE と共通の `RECIPE_NOTE_PROMPT`（#214）。ここで書き換えたり別の文面を持ったりしない。
 * Clipboard API が使えない環境（権限の無い WebView など）もあるので、文面は常に選択できる形で出しておく。
 */
export function PromptCopy() {
  const [state, setState] = useState<CopyState>('idle')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(RECIPE_NOTE_PROMPT)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <section aria-labelledby="prompt-copy-heading" className="space-y-2">
      <h2 id="prompt-copy-heading" className="font-medium">1. AI に書式を伝える</h2>
      <p className="text-sm text-muted-foreground">
        ChatGPT や Claude などでレシピを決めたら、この文面を送ってください。決まった書式でレシピを書いてくれます。
      </p>
      <Button type="button" variant="outline" onClick={copy}>
        {state === 'copied' ? <Check aria-hidden className="mr-1 h-4 w-4" /> : <Copy aria-hidden className="mr-1 h-4 w-4" />}
        {state === 'copied' ? 'コピーしました' : '文面をコピー'}
      </Button>
      {state === 'failed' && (
        <p role="alert" className="text-sm text-destructive">
          コピーできませんでした。下の文面を選択してコピーしてください。
        </p>
      )}
      <details open={state === 'failed'} className="rounded-md border text-sm">
        <summary className="cursor-pointer px-3 py-2">文面を見る</summary>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border-t px-3 py-2 text-xs">
          {RECIPE_NOTE_PROMPT}
        </pre>
      </details>
    </section>
  )
}
