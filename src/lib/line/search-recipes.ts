import { createServerClient } from '@/lib/db/client'
import type { ParsedSearchQuery } from './parse-search-query'

export interface SearchRecipeResult {
  id: string
  title: string
  url: string
  imageUrl: string | null
  sourceName: string | null
}

/**
 * 食材IDに対して、その食材+子食材のIDを取得
 * @returns Map<検索食材ID, [検索食材ID + 子食材ID]>
 */
async function expandIngredientIds(ingredientIds: string[]): Promise<Map<string, string[]>> {
  if (ingredientIds.length === 0) return new Map()

  const supabase = createServerClient()
  const { data } = await supabase
    .from('ingredients')
    .select('id, parent_id')
    .or(`id.in.(${ingredientIds.join(',')}),parent_id.in.(${ingredientIds.join(',')})`)

  const result = new Map<string, string[]>()
  for (const searchId of ingredientIds) {
    const matchingIds = (data ?? [])
      .filter((row) => row.id === searchId || row.parent_id === searchId)
      .map((row) => row.id)
    if (!matchingIds.includes(searchId)) {
      matchingIds.push(searchId)
    }
    result.set(searchId, matchingIds)
  }
  return result
}

/** 食材IDに該当するレシピIDを取得（AND条件） */
async function findRecipeIdsByIngredients(ingredientIds: string[]): Promise<string[] | null> {
  if (ingredientIds.length === 0) return null

  const supabase = createServerClient()
  const expandedIdsMap = await expandIngredientIds(ingredientIds)

  const matchingSets = await Promise.all(
    ingredientIds.map(async (searchId) => {
      const ids = expandedIdsMap.get(searchId) || [searchId]
      const { data } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .in('ingredient_id', ids)
        .eq('is_main', true)
      return new Set((data ?? []).map((r) => r.recipe_id))
    })
  )

  const intersection = matchingSets.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))))
  return Array.from(intersection)
}

/** Bot検索: 食材ID + タイトル検索でレシピを検索 */
export async function searchRecipesForBot(
  lineUserId: string,
  query: ParsedSearchQuery,
  limit: number = 10
): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()

  const { data: user } = await supabase.from('users').select('id').eq('line_user_id', lineUserId).single()
  if (!user) return []

  const recipeIds = await findRecipeIdsByIngredients(query.ingredientIds)
  if (recipeIds !== null && recipeIds.length === 0) return []

  let recipesQuery = supabase
    .from('recipes')
    .select('id, title, url, image_url, source_name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (recipeIds !== null) recipesQuery = recipesQuery.in('id', recipeIds)
  if (query.searchQuery.trim()) {
    const term = `%${query.searchQuery.trim()}%`
    recipesQuery = recipesQuery.or(`title.ilike.${term},memo.ilike.${term},source_name.ilike.${term}`)
  }

  const { data: recipes } = await recipesQuery
  if (!recipes) return []

  return recipes.map((r) => ({ id: r.id, title: r.title, url: r.url, imageUrl: r.image_url, sourceName: r.source_name }))
}
