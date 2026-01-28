'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useCreateRecipe } from '@/hooks/use-create-recipe'
import { RecipeForm, type RecipeFormData } from './recipe-form'
import { PageHeader, CenteredMessage } from './ui-parts'
import type { ParsedRecipe, IngredientsByCategory } from '@/types/recipe'

function CreateErrorAlert({ error }: { error: Error }) {
  return (
    <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3">
      <p className="text-sm text-destructive">{error.message}</p>
    </div>
  )
}

interface RecipeConfirmFormProps {
  url: string
  initialValues: ParsedRecipe
  ingredientCategories: IngredientsByCategory[]
}

export function RecipeConfirmForm({ url, initialValues, ingredientCategories }: RecipeConfirmFormProps) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { createRecipe, isLoading: createLoading, error: createError } = useCreateRecipe()

  const handleBack = useCallback(() => router.push('/recipes/add'), [router])

  const handleSubmit = useCallback(async (data: RecipeFormData) => {
    if (!user) return
    const input = {
      lineUserId: user.lineUserId,
      url,
      title: data.title,
      sourceName: data.sourceName || undefined,
      imageUrl: data.imageUrl || undefined,
      ingredientIds: data.ingredientIds,
      memo: data.memo || undefined,
    }
    const result = await createRecipe(input)
    if (result) router.push('/')
  }, [user, url, createRecipe, router])

  if (authLoading) return <CenteredMessage>読み込み中...</CenteredMessage>
  if (!user) return <CenteredMessage>ログインが必要です</CenteredMessage>

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="レシピを編集" onBack={handleBack} />
      <main className="container mx-auto max-w-2xl p-4">
        {createError && <CreateErrorAlert error={createError} />}
        <RecipeForm
          url={url}
          initialValues={initialValues}
          ingredientCategories={ingredientCategories}
          onSubmit={handleSubmit}
          onBack={handleBack}
          isSubmitting={createLoading}
        />
      </main>
    </div>
  )
}
