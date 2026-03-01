import { createServerClient } from '@/lib/db/client'
import type { ParsedSearchQuery } from './parse-search-query'
import { getVectorSearchIds } from '@/lib/db/queries/recipe-embedding'

const MIN_ILIKE_RESULTS = 3

export interface SearchRecipeResult {
  id: string
  title: string
  url: string
  imageUrl: string | null
  sourceName: string | null
  ingredientCount?: number | null
  cookingTimeMinutes?: number | null
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

  // 検索クエリがない場合は通常の検索
  if (!query.searchQuery.trim()) {
    let recipesQuery = supabase
      .from('recipes')
      .select('id, title, url, image_url, source_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (recipeIds !== null) recipesQuery = recipesQuery.in('id', recipeIds)

    const { data: recipes } = await recipesQuery
    if (!recipes) return []

    return recipes.map((r) => ({ id: r.id, title: r.title, url: r.url, imageUrl: r.image_url, sourceName: r.source_name }))
  }

  // ハイブリッド検索
  return searchRecipesHybridForBot(supabase, user.id, query.searchQuery.trim(), recipeIds, limit)
}

type RecipeRow = { id: string; title: string; url: string; image_url: string | null; source_name: string | null }
const toResult = (r: RecipeRow): SearchRecipeResult => ({ id: r.id, title: r.title, url: r.url, imageUrl: r.image_url, sourceName: r.source_name })

/** 最近見たレシピ（last_viewed_at DESC, NULL除外） */
export async function fetchRecentlyViewedForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const { data: user } = await supabase.from('users').select('id').eq('line_user_id', lineUserId).single()
  if (!user) return []

  const { data } = await supabase
    .from('recipes')
    .select('id, title, url, image_url, source_name')
    .eq('user_id', user.id)
    .not('last_viewed_at', 'is', null)
    .order('last_viewed_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map(toResult)
}

/** よく見るレシピ（view_count DESC, 0除外） */
export async function fetchMostViewedForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const { data: user } = await supabase.from('users').select('id').eq('line_user_id', lineUserId).single()
  if (!user) return []

  const { data } = await supabase
    .from('recipes')
    .select('id, title, url, image_url, source_name')
    .eq('user_id', user.id)
    .gt('view_count', 0)
    .order('view_count', { ascending: false })
    .limit(limit)
  return (data ?? []).map(toResult)
}

/** 材料少なめレシピ（ingredients_raw 配列長 ASC） */
export async function fetchFewIngredientsForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const { data: user } = await supabase.from('users').select('id').eq('line_user_id', lineUserId).single()
  if (!user) return []

  const { data } = await supabase.rpc('get_recipes_few_ingredients', { p_user_id: user.id, p_limit: limit })
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    imageUrl: r.image_url,
    sourceName: r.source_name,
    ingredientCount: r.ingredient_count,
  }))
}

/** 時短レシピ（cooking_time_minutes ASC、NULL除外） */
export async function fetchShortCookingTimeForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const { data: user } = await supabase.from('users').select('id').eq('line_user_id', lineUserId).single()
  if (!user) return []

  const { data } = await supabase.rpc('get_recipes_short_cooking_time', { p_user_id: user.id, p_limit: limit })
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    imageUrl: r.image_url,
    sourceName: r.source_name,
    cookingTimeMinutes: r.cooking_time_minutes,
  }))
}

/** Bot用ハイブリッド検索 */
async function searchRecipesHybridForBot(
  supabase: ReturnType<typeof createServerClient>, userId: string, searchQuery: string, recipeIds: string[] | null, limit: number
): Promise<SearchRecipeResult[]> {
  const term = `%${searchQuery}%`
  let q = supabase.from('recipes').select('id, title, url, image_url, source_name').eq('user_id', userId)
    .or(`title.ilike.${term},memo.ilike.${term},source_name.ilike.${term}`).order('created_at', { ascending: false }).limit(limit)
  if (recipeIds !== null) q = q.in('id', recipeIds)
  const { data } = await q
  const results = (data ?? []).map(toResult)
  if (results.length >= MIN_ILIKE_RESULTS) return results

  try {
    const excludeIds = results.map((r) => r.id)
    const additionalIds = await getVectorSearchIds(supabase, userId, searchQuery, excludeIds, limit)
    const filteredIds = recipeIds ? additionalIds.filter((id) => recipeIds.includes(id)) : additionalIds
    if (filteredIds.length > 0) {
      const { data: extra } = await supabase.from('recipes').select('id, title, url, image_url, source_name').in('id', filteredIds)
      return [...results, ...(extra ?? []).map(toResult)]
    }
  } catch (e) { console.error('[searchRecipesHybridForBot] Vector search failed:', e) }
  return results
}
