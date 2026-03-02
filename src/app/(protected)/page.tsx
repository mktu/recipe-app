import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { HomeClient, InitialFilters } from '@/components/features/home/home-client'
import type { SortOrder } from '@/types/recipe'

export const revalidate = 3600 // 1時間キャッシュ

const VALID_SORT_ORDERS = new Set<string>([
  'newest', 'oldest', 'most_viewed', 'recently_viewed', 'shortest_cooking', 'fewest_ingredients',
])

interface HomePageProps {
  searchParams: Promise<{ q?: string; ingredients?: string; sort?: string }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const { data: categories } = await fetchIngredientsByCategory()
  const params = await searchParams

  // クエリパラメータから初期フィルタを作成
  const validIngredientIds = new Set(
    categories.flatMap((c) => c.ingredients.map((i) => i.id))
  )
  const sortOrder = params.sort && VALID_SORT_ORDERS.has(params.sort)
    ? params.sort as SortOrder
    : undefined
  const initialFilters: InitialFilters = {
    searchQuery: params.q || '',
    ingredientIds: (params.ingredients || '')
      .split(',')
      .filter((id) => id && validIngredientIds.has(id)),
    sortOrder,
  }

  return <HomeClient ingredientCategories={categories} initialFilters={initialFilters} />
}
