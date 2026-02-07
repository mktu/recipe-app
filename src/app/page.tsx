import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { HomeClient, InitialFilters } from '@/components/features/home/home-client'

export const revalidate = 3600 // 1時間キャッシュ

interface HomePageProps {
  searchParams: Promise<{ q?: string; ingredients?: string }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const { data: categories } = await fetchIngredientsByCategory()
  const params = await searchParams

  // クエリパラメータから初期フィルタを作成
  const validIngredientIds = new Set(
    categories.flatMap((c) => c.ingredients.map((i) => i.id))
  )
  const initialFilters: InitialFilters = {
    searchQuery: params.q || '',
    ingredientIds: (params.ingredients || '')
      .split(',')
      .filter((id) => id && validIngredientIds.has(id)),
  }

  return <HomeClient ingredientCategories={categories} initialFilters={initialFilters} />
}
