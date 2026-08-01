import { createServerClient } from '@/lib/db/client'
import { findUserId, type SearchRecipeResult } from './search-recipes'

const RECIPE_COLUMNS = 'id, title, url, image_url, source_name, cooking_time_minutes, ingredients_raw'

type RecipeRow = {
  id: string
  title: string
  url: string
  image_url: string | null
  source_name: string | null
  cooking_time_minutes: number | null
  ingredients_raw: unknown
}

const toResult = (r: RecipeRow): SearchRecipeResult => ({
  id: r.id,
  title: r.title,
  url: r.url,
  imageUrl: r.image_url,
  sourceName: r.source_name,
  cookingTimeMinutes: r.cooking_time_minutes,
  ingredientCount: Array.isArray(r.ingredients_raw) ? r.ingredients_raw.length : null,
})

type RpcRow = {
  id: string
  title: string
  url: string
  image_url: string | null
  source_name: string | null
  cooking_time_minutes: number | null
  ingredient_count: number | null
}

const rpcToResult = (r: RpcRow): SearchRecipeResult => ({
  id: r.id,
  title: r.title,
  url: r.url,
  imageUrl: r.image_url,
  sourceName: r.source_name,
  cookingTimeMinutes: r.cooking_time_minutes,
  ingredientCount: r.ingredient_count,
})

/** 最近見たレシピ（last_viewed_at DESC, NULL除外） */
export async function fetchRecentlyViewedForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const userId = await findUserId(supabase, lineUserId)
  if (!userId) return []

  const { data } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('user_id', userId)
    .not('last_viewed_at', 'is', null)
    .order('last_viewed_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map(toResult)
}

/** よく見るレシピ（view_count DESC, 0除外） */
export async function fetchMostViewedForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const userId = await findUserId(supabase, lineUserId)
  if (!userId) return []

  const { data } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('user_id', userId)
    .gt('view_count', 0)
    .order('view_count', { ascending: false })
    .limit(limit)
  return (data ?? []).map(toResult)
}

/** 材料少なめレシピ（ingredients_raw 配列長 ASC） */
export async function fetchFewIngredientsForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const userId = await findUserId(supabase, lineUserId)
  if (!userId) return []

  const { data } = await supabase.rpc('get_recipes_few_ingredients', { p_user_id: userId, p_limit: limit })
  return (data ?? []).map(rpcToResult)
}

/** 最近追加したレシピ（created_at DESC） */
export async function fetchRecentlyAddedForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const userId = await findUserId(supabase, lineUserId)
  if (!userId) return []

  const { data } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map(toResult)
}

/** 時短レシピ（cooking_time_minutes ASC、NULL除外） */
export async function fetchShortCookingTimeForBot(lineUserId: string, limit = 5): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const userId = await findUserId(supabase, lineUserId)
  if (!userId) return []

  const { data } = await supabase.rpc('get_recipes_short_cooking_time', { p_user_id: userId, p_limit: limit })
  return (data ?? []).map(rpcToResult)
}
