import { SupabaseClient } from '@supabase/supabase-js'
import { supabase, createServerClient } from '@/lib/db/client'
import type { Database, Tables, TablesInsert } from '@/types/database'
import type { SortOrder, RecipeWithIngredients, RecipeIngredient, CreateRecipeInput } from '@/types/recipe'

type TypedSupabaseClient = SupabaseClient<Database>

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

type IngredientWithParent = {
  id: string
  parent_id: string | null
}

/**
 * 食材IDとその子食材IDを取得（親子展開）
 * 例: 「豚肉」のIDを渡すと、「豚肉」「豚バラ肉」「豚こま切れ肉」等のIDを返す
 */
async function getIngredientAndChildIds(ingredientIds: string[]): Promise<Map<string, string[]>> {
  if (ingredientIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('ingredients')
    .select('id, parent_id')
    .or(`id.in.(${ingredientIds.join(',')}),parent_id.in.(${ingredientIds.join(',')})`)

  if (error) {
    console.error('[getIngredientAndChildIds] Error:', error)
    return new Map(ingredientIds.map((id) => [id, [id]]))
  }

  const rows = (data ?? []) as IngredientWithParent[]

  // 各検索食材IDに対して、マッチするID一覧を構築
  const result = new Map<string, string[]>()
  for (const searchId of ingredientIds) {
    const matchingIds = rows
      .filter((row) => row.id === searchId || row.parent_id === searchId)
      .map((row) => row.id)
    // 自分自身も含める
    if (!matchingIds.includes(searchId)) {
      matchingIds.push(searchId)
    }
    result.set(searchId, matchingIds)
  }
  return result
}

/** 食材IDでフィルタリング（AND ロジック + 親子展開） */
async function filterByIngredients(
  recipes: RecipeWithIngredients[],
  ingredientIds: string[]
): Promise<RecipeWithIngredients[]> {
  if (ingredientIds.length === 0) return recipes

  // 各検索食材について、その食材+子食材のIDを取得
  const expandedIdsMap = await getIngredientAndChildIds(ingredientIds)

  return recipes.filter((recipe) => {
    const recipeIngredientIds = recipe.mainIngredients.map((i) => i.id)

    // 全ての検索食材について、その食材か子食材がレシピに含まれているか
    return ingredientIds.every((searchId) => {
      const expandedIds = expandedIdsMap.get(searchId) || [searchId]
      return expandedIds.some((id) => recipeIngredientIds.includes(id))
    })
  })
}

/** ユーザーのレシピ一覧を取得 */
export async function fetchRecipes(
  params: FetchRecipesParams
): Promise<{ data: RecipeWithIngredients[]; error: Error | null }> {
  const { userId: lineUserId, searchQuery, ingredientIds = [], sortOrder = 'newest' } = params

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single()

    if (!user) return { data: [], error: null }

    const userId = (user as { id: string }).id
    const recipes = await fetchRecipesFromDb(userId, searchQuery, sortOrder)
    if (recipes.length === 0) return { data: [], error: null }

    const ingredientMap = await fetchIngredientMap(recipes.map((r) => r.id))
    const result = recipes.map((r) => ({ ...r, mainIngredients: ingredientMap.get(r.id) || [] }))

    return { data: await filterByIngredients(result, ingredientIds), error: null }
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

export interface CreateRecipeResult {
  id: string
}

async function getUserIdByLineUserId(client: TypedSupabaseClient, lineUserId: string): Promise<string | null> {
  const { data, error } = await client.from('users').select('id').eq('line_user_id', lineUserId).single()
  return error || !data ? null : (data as { id: string }).id
}

async function insertRecipe(client: TypedSupabaseClient, userId: string, input: CreateRecipeInput): Promise<{ id: string } | null> {
  const recipeData: TablesInsert<'recipes'> = {
    user_id: userId,
    url: input.url,
    title: input.title,
    source_name: input.sourceName || null,
    image_url: input.imageUrl || null,
    memo: input.memo || null,
    // 食材マッチングが完了している場合は true
    ingredients_linked: input.ingredientIds.length > 0,
  }
  const { data, error } = await client.from('recipes').insert(recipeData).select('id').single()
  if (error) throw error
  return data
}

async function insertRecipeIngredients(client: TypedSupabaseClient, recipeId: string, ingredientIds: string[]): Promise<void> {
  if (ingredientIds.length === 0) return
  const rows: TablesInsert<'recipe_ingredients'>[] = ingredientIds.map((id) => ({
    recipe_id: recipeId,
    ingredient_id: id,
    is_main: true,
  }))
  const { error } = await client.from('recipe_ingredients').insert(rows)
  if (error) console.error('[createRecipe] recipe_ingredients insert error:', error)
}

/** レシピを新規作成 */
export async function createRecipe(input: CreateRecipeInput): Promise<{ data: CreateRecipeResult | null; error: Error | null }> {
  const client = createServerClient()

  try {
    const userId = await getUserIdByLineUserId(client, input.lineUserId)
    if (!userId) return { data: null, error: new Error('ユーザーが見つかりません') }

    const recipe = await insertRecipe(client, userId, input)
    if (!recipe) return { data: null, error: new Error('レシピの作成に失敗しました') }

    await insertRecipeIngredients(client, recipe.id, input.ingredientIds)
    return { data: { id: recipe.id }, error: null }
  } catch (err) {
    console.error('[createRecipe] Error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

// 詳細関連のクエリは recipe-detail.ts から re-export
export { fetchRecipeById, deleteRecipe, updateRecipeMemo, recordRecipeView } from './recipe-detail'
