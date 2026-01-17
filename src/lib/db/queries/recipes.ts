import { supabase } from '@/lib/db/client'
import type { Tables } from '@/types/database'
import type { SortOrder, RecipeWithIngredients, RecipeIngredient } from '@/types/recipe'

export interface FetchRecipesParams {
  userId: string
  searchQuery?: string
  ingredientIds?: string[]
  sortOrder?: SortOrder
}

type RecipeIngredientRow = {
  recipe_id: string
  ingredient_id: string
  is_main: boolean
  ingredients: { id: string; name: string } | null
}

/** レシピごとの食材マップを構築 */
function buildIngredientMap(rows: RecipeIngredientRow[]): Map<string, RecipeIngredient[]> {
  const map = new Map<string, RecipeIngredient[]>()
  for (const ri of rows) {
    if (!ri.ingredients) continue
    const list = map.get(ri.recipe_id) || []
    list.push({ id: ri.ingredients.id, name: ri.ingredients.name, isMain: ri.is_main })
    map.set(ri.recipe_id, list)
  }
  return map
}

/** 食材IDでフィルタリング（AND ロジック） */
function filterByIngredients(
  recipes: RecipeWithIngredients[],
  ingredientIds: string[]
): RecipeWithIngredients[] {
  if (ingredientIds.length === 0) return recipes
  return recipes.filter((recipe) => {
    const ids = recipe.mainIngredients.map((i) => i.id)
    return ingredientIds.every((id) => ids.includes(id))
  })
}

/** ユーザーのレシピ一覧を取得 */
export async function fetchRecipes(
  params: FetchRecipesParams
): Promise<{ data: RecipeWithIngredients[]; error: Error | null }> {
  const { userId, searchQuery, ingredientIds = [], sortOrder = 'newest' } = params

  try {
    const recipes = await fetchRecipesFromDb(userId, searchQuery, sortOrder)
    if (recipes.length === 0) return { data: [], error: null }

    const ingredientMap = await fetchIngredientMap(recipes.map((r) => r.id))
    const result = recipes.map((r) => ({ ...r, mainIngredients: ingredientMap.get(r.id) || [] }))

    return { data: filterByIngredients(result, ingredientIds), error: null }
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function fetchRecipesFromDb(
  userId: string,
  searchQuery: string | undefined,
  sortOrder: SortOrder
): Promise<Tables<'recipes'>[]> {
  let query = supabase.from('recipes').select('*').eq('user_id', userId)

  if (searchQuery?.trim()) {
    const term = `%${searchQuery.trim()}%`
    query = query.or(`title.ilike.${term},memo.ilike.${term},source_name.ilike.${term}`)
  }

  query = applySortOrder(query, sortOrder)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Tables<'recipes'>[]
}

function applySortOrder<T>(query: T, sortOrder: SortOrder): T {
  const q = query as { order: (col: string, opts: object) => T }
  const opts: Record<SortOrder, [string, object]> = {
    newest: ['created_at', { ascending: false }],
    oldest: ['created_at', { ascending: true }],
    most_viewed: ['view_count', { ascending: false }],
    recently_viewed: ['last_viewed_at', { ascending: false, nullsFirst: false }],
  }
  const [col, opt] = opts[sortOrder]
  return q.order(col, opt)
}

async function fetchIngredientMap(recipeIds: string[]): Promise<Map<string, RecipeIngredient[]>> {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, is_main, ingredients(id, name)')
    .in('recipe_id', recipeIds)
    .eq('is_main', true)

  if (error) throw error
  return buildIngredientMap((data ?? []) as RecipeIngredientRow[])
}

/** 閲覧数をカウントアップ（TODO: レシピ詳細画面実装時に使用） */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function recordRecipeView(recipeId: string): Promise<void> {
  // TODO: レシピ詳細画面実装時に実装
}
