/** 詳細画面・ノート画面で共有する、取得中とメッセージだけの状態表示 */

export function LoadingState() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      <div className="aspect-video animate-pulse rounded-xl bg-muted" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  )
}

export function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}
