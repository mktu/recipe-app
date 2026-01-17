'use client'

import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  hasFilters: boolean
  onAddRecipe?: () => void
  onClearFilters?: () => void
}

export function EmptyState({ hasFilters, onAddRecipe, onClearFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="text-5xl">🔍</div>
        <div>
          <h3 className="font-semibold">該当するレシピがありません</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            検索条件を変更してみてください
          </p>
        </div>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            フィルターをクリア
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="text-5xl">📖</div>
      <div>
        <h3 className="font-semibold">レシピがまだ保存されていません</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          お気に入りのレシピを追加してみましょう
        </p>
      </div>
      {onAddRecipe && (
        <Button onClick={onAddRecipe}>レシピを追加</Button>
      )}
    </div>
  )
}
