import { redirect } from 'next/navigation'
import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { RecipeConfirmForm } from '@/components/features/add-recipe/recipe-confirm-form'

interface ConfirmRecipePageProps {
  searchParams: Promise<{ url?: string }>
}

export default async function ConfirmRecipePage({ searchParams }: ConfirmRecipePageProps) {
  const { url } = await searchParams

  if (!url) {
    redirect('/recipes/add')
  }

  // サーバーサイドでレシピ情報を解析
  const parsedData = await parseRecipe(url)

  return <RecipeConfirmForm url={url} initialValues={parsedData} />
}
