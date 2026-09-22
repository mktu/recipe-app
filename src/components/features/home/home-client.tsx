'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'
import { useRecipes } from '@/hooks/use-recipes'
import { useRecipeFilters, InitialFilters } from '@/hooks/use-recipe-filters'
export type { InitialFilters }
import { SearchBar } from './search-bar'
import { SortSelect } from './sort-select'
import { FilterBar } from './filter-bar'
import { RecipeList } from './recipe-list'
import { AddRecipeFAB } from './add-recipe-fab'
import type { SortOrder, IngredientsByCategory } from '@/types/recipe'

interface HomeClientProps {
  ingredientCategories: IngredientsByCategory[]
  initialFilters?: InitialFilters
}

function useRecipeHandlers() {
  const router = useRouter()
  const authedFetch = useAuthedFetch()
  // 詳細への遷移は RecipeCard の `<Link>` が行うので、ここは閲覧記録だけ
  const trackRecipeView = useCallback((id: string) => {
    authedFetch(`/api/track/recipe/${id}`, { method: 'POST' }).catch(() => {})
  }, [authedFetch])
  const handleAddRecipe = useCallback(() => router.push('/recipes/add'), [router])
  return { trackRecipeView, handleAddRecipe }
}

export function HomeClient({ ingredientCategories, initialFilters }: HomeClientProps) {
  const { trackRecipeView, handleAddRecipe } = useRecipeHandlers()
  const { isLoading: authLoading, isAuthenticated, error: authError, relogin } = useAuth()
  const filters = useRecipeFilters(ingredientCategories, initialFilters)

  const {
    recipes,
    availableSourceNames,
    isLoading: recipesLoading,
    error: recipesError,
    refetch,
  } = useRecipes({
    searchQuery: filters.searchQuery,
    ingredientIds: filters.selectedIngredientIds,
    sourceNames: filters.selectedSourceNames,
    sortOrder: filters.sortOrder,
  })

  if (authLoading) {
    return <CenteredMessage>読み込み中...</CenteredMessage>
  }

  if (authError) {
    return <AuthErrorMessage error={authError} onRelogin={relogin} />
  }

  if (!isAuthenticated) {
    return <CenteredMessage>ログインが必要です</CenteredMessage>
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header sortOrder={filters.sortOrder} onSortChange={filters.setSortOrder} />
      <main className="container mx-auto max-w-2xl space-y-4 p-4">
        <SearchBar value={filters.searchQuery} onChange={filters.setSearchQuery} />
        <FilterBar filters={filters} ingredientCategories={ingredientCategories} availableSourceNames={availableSourceNames} />
        {recipesError ? (
          <RecipeListError onRetry={refetch} />
        ) : (
          <RecipeList
            recipes={recipes}
            isLoading={recipesLoading}
            hasFilters={filters.hasFilters}
            onRecipeOpen={trackRecipeView}
            onAddRecipe={handleAddRecipe}
            onClearFilters={filters.clearFilters}
          />
        )}
      </main>
      <AddRecipeFAB onClick={handleAddRecipe} />
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}

/**
 * 一覧の取得に失敗したことを出す。
 *
 * これを出さないと、`get-recipes` が落ちていても EmptyState（「レシピがまだ保存されて
 * いません」）が出るだけで、**0件と取得失敗が見分けられない**。
 * Edge Runtime が死んでいてローカルが丸一日壊れていても気付けなかった（#39）。
 */
function RecipeListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/50 p-6 text-center">
      <p className="text-sm text-destructive">レシピの取得に失敗しました</p>
      <p className="mt-1 text-xs text-muted-foreground">
        通信状況を確認して、もう一度お試しください
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        再読み込み
      </button>
    </div>
  )
}

function AuthErrorMessage({ error, onRelogin }: { error: string; onRelogin: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <p className="mb-4 text-destructive">エラーが発生しました</p>
      <pre className="mb-4 max-w-full overflow-auto rounded bg-muted p-4 text-xs">{error}</pre>
      <button
        onClick={onRelogin}
        className="rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
      >
        再ログイン
      </button>
    </div>
  )
}

interface HeaderProps {
  sortOrder: SortOrder
  onSortChange: (order: SortOrder) => void
}

function Header({ sortOrder, onSortChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex max-w-2xl items-center justify-between p-4">
        <Image src="/logo.png" alt="RecipeHub" width={175} height={58} priority />
        <div className="flex items-center gap-2">
          <SortSelect value={sortOrder} onChange={onSortChange} />
          <Link href="/settings" className="text-muted-foreground hover:text-foreground" aria-label="設定">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
