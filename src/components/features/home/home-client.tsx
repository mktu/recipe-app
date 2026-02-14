'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useRecipes } from '@/hooks/use-recipes'
import { useRecipeFilters, InitialFilters } from '@/hooks/use-recipe-filters'
export type { InitialFilters }
import { SearchBar } from './search-bar'
import { SortSelect } from './sort-select'
import { IngredientFilter } from './ingredient-filter'
import { SelectedIngredients } from './selected-ingredients'
import { RecipeList } from './recipe-list'
import { AddRecipeFAB } from './add-recipe-fab'
import type { SortOrder, IngredientsByCategory } from '@/types/recipe'

interface HomeClientProps {
  ingredientCategories: IngredientsByCategory[]
  initialFilters?: InitialFilters
}

export function HomeClient({ ingredientCategories, initialFilters }: HomeClientProps) {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, error: authError, relogin } = useAuth()
  const filters = useRecipeFilters(ingredientCategories, initialFilters)

  const { recipes, isLoading: recipesLoading } = useRecipes({
    searchQuery: filters.searchQuery,
    ingredientIds: filters.selectedIngredientIds,
    sortOrder: filters.sortOrder,
  })

  const handleRecipeClick = useCallback((id: string) => router.push(`/recipes/${id}`), [router])
  const handleAddRecipe = useCallback(() => router.push('/recipes/add'), [router])

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
        <div className="flex flex-wrap items-center gap-2">
          <IngredientFilter
            categories={ingredientCategories}
            selectedIds={filters.selectedIngredientIds}
            onSelectionChange={filters.setSelectedIngredientIds}
          />
          <SelectedIngredients
            ids={filters.selectedIngredientIds}
            nameMap={filters.ingredientNameMap}
            onRemove={filters.removeIngredient}
          />
        </div>
        <RecipeList
          recipes={recipes}
          isLoading={recipesLoading}
          hasFilters={filters.hasFilters}
          onRecipeClick={handleRecipeClick}
          onAddRecipe={handleAddRecipe}
          onClearFilters={filters.clearFilters}
        />
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
        <h1 className="text-xl font-bold text-primary">RecipeHub</h1>
        <SortSelect value={sortOrder} onChange={onSortChange} />
      </div>
    </header>
  )
}
