import { redirect } from 'next/navigation'
import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { RecipeConfirmForm } from '@/components/features/add-recipe/recipe-confirm-form'

interface ConfirmRecipePageProps {
  searchParams: Promise<{ url?: string }>
}

export default async function ConfirmRecipePage({ searchParams }: ConfirmRecipePageProps) {
  const { url } = await searchParams

  if (!url) {
    redirect('/recipes/add')
  }

  // サーバーサイドでレシピ情報と食材データを取得
  const [parsedData, { data: ingredientCategories }] = await Promise.all([
    parseRecipe(url),
    fetchIngredientsByCategory(),
  ])

  return <RecipeConfirmForm url={url} initialValues={parsedData} ingredientCategories={ingredientCategories} />
}
