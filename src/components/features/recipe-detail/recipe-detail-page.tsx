'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { RecipeDetail } from '@/types/recipe'
import { RecipeHeader } from './recipe-header'
import { RecipeIngredients } from './recipe-ingredients'
import { RecipeMemo } from './recipe-memo'
import { RecipeActions } from './recipe-actions'
import { useRecipeActions } from './use-recipe-actions'

interface RecipeDetailPageProps {
  recipe: RecipeDetail
}

export function RecipeDetailPage({ recipe }: RecipeDetailPageProps) {
  const router = useRouter()
  const { memo, updateMemo, deleteRecipe } = useRecipeActions({
    recipeId: recipe.id,
    initialMemo: recipe.memo,
  })

  const handleBack = useCallback(() => router.back(), [router])
  const createdAt = recipe.created_at ? new Date(recipe.created_at).toLocaleDateString('ja-JP') : '-'

  return (
    <div className="mx-auto max-w-lg p-4">
      <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        戻る
      </Button>

      <div className="space-y-6">
        <RecipeHeader
          title={recipe.title}
          sourceName={recipe.source_name}
          imageUrl={recipe.image_url}
          mainIngredients={recipe.mainIngredients}
        />
        <RecipeIngredients ingredients={recipe.ingredientsRaw} />
        <RecipeMemo memo={memo} onUpdate={updateMemo} />
        <p className="text-center text-sm text-muted-foreground">登録日: {createdAt}</p>
        <RecipeActions url={recipe.url} onDelete={deleteRecipe} />
      </div>
    </div>
  )
}
