'use client'

import { RecipeCard } from './recipe-card'
import { EmptyState } from './empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecipeWithIngredients } from '@/types/recipe'

interface RecipeListProps {
  recipes: RecipeWithIngredients[]
  isLoading: boolean
  hasFilters: boolean
  onRecipeClick: (recipeId: string) => void
  onAddRecipe: () => void
  onClearFilters: () => void
}

function RecipeListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border p-3">
          <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function RecipeList({
  recipes,
  isLoading,
  hasFilters,
  onRecipeClick,
  onAddRecipe,
  onClearFilters,
}: RecipeListProps) {
  if (isLoading) {
    return <RecipeListSkeleton />
  }

  if (recipes.length === 0) {
    return (
      <EmptyState
        hasFilters={hasFilters}
        onAddRecipe={onAddRecipe}
        onClearFilters={onClearFilters}
      />
    )
  }

  return (
    <div className="space-y-3">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={() => onRecipeClick(recipe.id)}
        />
      ))}
    </div>
  )
}
