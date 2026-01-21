export default function Loading() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      {/* 戻るボタン */}
      <div className="h-8 w-16 animate-pulse rounded bg-muted" />

      {/* 画像 */}
      <div className="aspect-video animate-pulse rounded-xl bg-muted" />

      {/* タイトル */}
      <div className="space-y-2">
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>

      {/* バッジ */}
      <div className="flex gap-2">
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
      </div>

      {/* 材料カード */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* メモカード */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="h-5 w-10 animate-pulse rounded bg-muted" />
        <div className="h-16 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
