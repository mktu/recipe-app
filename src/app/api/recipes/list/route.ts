import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/db/client'
import type { Database, Tables } from '@/types/database'
import type { SortOrder, RecipeWithIngredients, RecipeIngredient } from '@/types/recipe'
import { NextRequest, NextResponse } from 'next/server'
import { getVectorSearchIds } from '@/lib/db/queries/recipe-embedding'

const MIN_ILIKE_RESULTS = 3

type TypedSupabaseClient = SupabaseClient<Database>
type RecipeRow = Tables<'recipes'>

interface ListRecipesRequest {
  lineUserId: string
  searchQuery?: string
  ingredientIds?: string[]
  sortOrder?: SortOrder
}

type RecipeIngredientRow = {
  recipe_id: string
  is_main: boolean
  ingredients: { id: string; name: string } | null
}

const sortConfig: Record<SortOrder, [string, { ascending: boolean; nullsFirst?: boolean }]> = {
  newest: ['created_at', { ascending: false }],
  oldest: ['created_at', { ascending: true }],
  most_viewed: ['view_count', { ascending: false }],
  recently_viewed: ['last_viewed_at', { ascending: false, nullsFirst: false }],
}

async function getUserId(client: TypedSupabaseClient, lineUserId: string): Promise<string | null> {
  const { data } = await client.from('users').select('id').eq('line_user_id', lineUserId).single()
  return (data as { id: string } | null)?.id ?? null
}

async function fetchRecipes(client: TypedSupabaseClient, userId: string, searchQuery: string | undefined, sortOrder: SortOrder) {
  // 検索クエリがない場合は通常の取得
  if (!searchQuery?.trim()) {
    const query = client.from('recipes').select('*').eq('user_id', userId)
    const [col, opt] = sortConfig[sortOrder]
    return query.order(col, opt)
  }

  // ハイブリッド検索
  return searchRecipesHybrid(client, userId, searchQuery.trim(), sortOrder)
}

/** ハイブリッド検索: ILIKE優先、結果が少ない場合はベクトル検索で補完 */
async function searchRecipesHybrid(client: TypedSupabaseClient, userId: string, searchQuery: string, sortOrder: SortOrder) {
  const term = `%${searchQuery}%`
  let query = client.from('recipes').select('*').eq('user_id', userId)
    .or(`title.ilike.${term},memo.ilike.${term},source_name.ilike.${term}`)
  const [col, opt] = sortConfig[sortOrder]
  query = query.order(col, opt)
  const { data, error } = await query
  if (error) return { data: null, error }
  const ilikeRecipes = (data ?? []) as RecipeRow[]
  if (ilikeRecipes.length >= MIN_ILIKE_RESULTS) return { data: ilikeRecipes, error: null }

  try {
    const additionalIds = await getVectorSearchIds(client, userId, searchQuery, ilikeRecipes.map((r) => r.id), 20)
    if (additionalIds.length > 0) {
      const { data: extra } = await client.from('recipes').select('*').in('id', additionalIds)
      return { data: [...ilikeRecipes, ...((extra ?? []) as RecipeRow[])], error: null }
    }
  } catch (e) { console.error('[searchRecipesHybrid] Vector search failed:', e) }
  return { data: ilikeRecipes, error: null }
}

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
async function getIngredientAndChildIds(client: TypedSupabaseClient, ingredientIds: string[]): Promise<Map<string, string[]>> {
  if (ingredientIds.length === 0) return new Map()

  const { data, error } = await client
    .from('ingredients')
    .select('id, parent_id')
    .or(`id.in.(${ingredientIds.join(',')}),parent_id.in.(${ingredientIds.join(',')})`)

  if (error) {
    console.error('[getIngredientAndChildIds] Error:', error)
    return new Map(ingredientIds.map((id) => [id, [id]]))
  }

  const rows = (data ?? []) as IngredientWithParent[]
  const result = new Map<string, string[]>()
  for (const searchId of ingredientIds) {
    const matchingIds = rows
      .filter((row) => row.id === searchId || row.parent_id === searchId)
      .map((row) => row.id)
    if (!matchingIds.includes(searchId)) {
      matchingIds.push(searchId)
    }
    result.set(searchId, matchingIds)
  }
  return result
}

async function filterByIngredients(client: TypedSupabaseClient, recipes: RecipeWithIngredients[], ingredientIds: string[]): Promise<RecipeWithIngredients[]> {
  if (ingredientIds.length === 0) return recipes

  // 各検索食材について、その食材+子食材のIDを取得
  const expandedIdsMap = await getIngredientAndChildIds(client, ingredientIds)

  return recipes.filter((recipe) => {
    const recipeIngredientIds = recipe.mainIngredients.map((i) => i.id)
    return ingredientIds.every((searchId) => {
      const expandedIds = expandedIdsMap.get(searchId) || [searchId]
      return expandedIds.some((id) => recipeIngredientIds.includes(id))
    })
  })
}

async function fetchRecipeIngredients(client: TypedSupabaseClient, recipeIds: string[]): Promise<Map<string, RecipeIngredient[]>> {
  const { data } = await client
    .from('recipe_ingredients')
    .select('recipe_id, is_main, ingredients(id, name)')
    .in('recipe_id', recipeIds)
    .eq('is_main', true)
  return buildIngredientMap((data || []) as RecipeIngredientRow[])
}

function attachIngredients(recipes: RecipeRow[], ingredientMap: Map<string, RecipeIngredient[]>): RecipeWithIngredients[] {
  return recipes.map((r) => ({ ...r, mainIngredients: ingredientMap.get(r.id) || [] }))
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timings: Record<string, number> = {}

  const { lineUserId, searchQuery, ingredientIds = [], sortOrder = 'newest' } = (await request.json()) as ListRecipesRequest
  if (!lineUserId) return NextResponse.json({ error: 'lineUserId は必須です' }, { status: 400 })

  const client = createServerClient()

  try {
    let t = Date.now()
    const userId = await getUserId(client, lineUserId)
    timings.getUserId = Date.now() - t
    if (!userId) return NextResponse.json({ data: [] })

    t = Date.now()
    const { data: recipes, error } = await fetchRecipes(client, userId, searchQuery, sortOrder)
    timings.fetchRecipes = Date.now() - t
    if (error) throw error
    if (!recipes?.length) return NextResponse.json({ data: [] })

    t = Date.now()
    const ingredientMap = await fetchRecipeIngredients(client, recipes.map((r: { id: string }) => r.id))
    timings.fetchIngredients = Date.now() - t

    const result = attachIngredients(recipes, ingredientMap)

    t = Date.now()
    const filtered = await filterByIngredients(client, result, ingredientIds)
    timings.filterByIngredients = Date.now() - t

    timings.total = Date.now() - startTime
    console.log('[POST /api/recipes/list] Timings:', timings, { recipeCount: filtered.length })

    return NextResponse.json({ data: filtered })
  } catch (err) {
    console.error('[POST /api/recipes/list] Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
