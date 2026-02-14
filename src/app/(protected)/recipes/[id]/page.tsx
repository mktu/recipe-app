import { RecipeDetailWrapper } from '@/components/features/recipe-detail'

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params

  return <RecipeDetailWrapper recipeId={id} />
}
