import { BookOpenIcon, SearchIcon } from 'lucide-react'

export function ScreenshotSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          シンプルで使いやすい
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          あなた専用のレシピ図鑑
        </p>

        <div className="mt-12 flex justify-center gap-4">
          <ScreenshotPlaceholder
            icon={<BookOpenIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />}
            label="レシピ一覧画面"
          />
          <ScreenshotPlaceholder
            icon={<SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />}
            label="食材検索画面"
            className="hidden sm:block"
          />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          ※ 画像はイメージです
        </p>
      </div>
    </section>
  )
}

function ScreenshotPlaceholder({
  icon,
  label,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <div
      className={`w-48 overflow-hidden rounded-2xl border bg-card shadow-lg ${className}`}
    >
      <div className="flex h-80 items-center justify-center bg-muted/50">
        <div className="text-center">
          {icon}
          <p className="mt-2 text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}
