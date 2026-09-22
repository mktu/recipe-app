'use client'

import type { KeyboardEvent } from 'react'

interface MemoDisplayProps {
  memo: string | null
  onClick: () => void
}

export function MemoDisplay({ memo, onClick }: MemoDisplayProps) {
  // 見た目はカードのままだが、クリックしか受け付けないとキーボードでメモを開けない。
  // role / tabIndex / Enter・Space を足してボタンとして扱えるようにしている。
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onClick()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="メモを編集"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="min-h-[80px] cursor-pointer rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
    >
      {memo ? (
        <p className="whitespace-pre-wrap text-sm">{memo}</p>
      ) : (
        <p className="text-sm text-muted-foreground">タップしてメモを追加...</p>
      )}
    </div>
  )
}
