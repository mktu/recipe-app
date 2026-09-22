'use client'

interface MemoDisplayProps {
  memo: string | null
  onClick: () => void
}

export function MemoDisplay({ memo, onClick }: MemoDisplayProps) {
  // 中身は <span>。<button> の content model は phrasing content なので <p> は入れられない。
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="メモを編集"
      className="block min-h-[80px] w-full cursor-pointer rounded-lg bg-muted/50 p-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {memo ? (
        <span className="block whitespace-pre-wrap text-sm">{memo}</span>
      ) : (
        <span className="block text-sm text-muted-foreground">タップしてメモを追加...</span>
      )}
    </button>
  )
}
