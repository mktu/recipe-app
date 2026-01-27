import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { HomeClient } from '@/components/features/home/home-client'

export const revalidate = 3600 // 1時間キャッシュ

export default async function Home() {
  const { data: categories } = await fetchIngredientsByCategory()

  return <HomeClient ingredientCategories={categories} />
}
