'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MarkdownPasteFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** 登録できない理由（パーサの `blockingReasons`）。空なら出さない */
  blockingReasons: string[]
}

/**
 * 書式に沿ったレシピの貼り付け欄（#178）。
 *
 * 登録できない内容（表を含む・材料が無いなど）は編集へ進ませず、理由をここに出す。
 */
export function MarkdownPasteForm({ value, onChange, onSubmit, blockingReasons }: MarkdownPasteFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="note-markdown">貼り付けるレシピ</Label>
      <Textarea
        id="note-markdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder={'[レシピ入力]\n# 料理名\n...'}
        aria-describedby={blockingReasons.length > 0 ? 'paste-hint paste-blocking' : 'paste-hint'}
      />
      <p id="paste-hint" className="text-sm text-muted-foreground">前後に別の文が混ざっていても、書式の部分だけを読み取ります。</p>
      {blockingReasons.length > 0 && <BlockingReasons reasons={blockingReasons} />}
      <Button type="submit" className="w-full" disabled={!value.trim()}>読み取る</Button>
    </form>
  )
}

function BlockingReasons({ reasons }: { reasons: string[] }) {
  return (
    <div id="paste-blocking" role="alert" className="space-y-1 rounded-md border border-destructive/50 p-3 text-sm">
      <p className="font-medium text-destructive">このままでは取り込めません</p>
      <ul className="list-disc pl-5">
        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <p className="text-muted-foreground">
        書式に合わせて直してから貼り直すか、<Link href="/notes/new" className="underline">自分で書く</Link>こともできます。
      </p>
    </div>
  )
}
