'use client'

interface MemoDisplayProps {
  memo: string | null
  onClick: () => void
}

export function MemoDisplay({ memo, onClick }: MemoDisplayProps) {
  return (
    <div
      onClick={onClick}
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
