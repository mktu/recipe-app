'use client'

interface MemoDisplayProps {
  memo: string | null
  onClick: () => void
}

export function MemoDisplay({ memo, onClick }: MemoDisplayProps) {
  // 中身は <span>。<button> の content model は phrasing content なので <p> は入れられない。
  //
  // `flex items-start` は必須。<button> は UA 既定で中身を垂直中央に置くため、
  // min-h と併用すると余白が上下に等分され、テキストが浮いて見える（上下30px / 左右12px）。
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="メモを編集"
      className="flex min-h-[80px] w-full cursor-pointer items-start rounded-lg bg-muted/50 p-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {memo ? (
        <span className="w-full whitespace-pre-wrap text-sm">{memo}</span>
      ) : (
        <span className="w-full text-sm text-muted-foreground">タップしてメモを追加...</span>
      )}
    </button>
  )
}
