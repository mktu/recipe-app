/**
 * レシピ一覧取得 Edge Function
 *
 * Vercel API Route から呼び出され、レシピ一覧を返す。
 * Edge Function と DB が同一リージョンにあるため、
 * 複数クエリでも低レイテンシで実行できる。
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  buildIngredientIndexFromRows,
  expandWithChildren,
  type AliasRow,
  type IngredientIndex,
  type IngredientRow,
} from './search/ingredient-index.ts'
import { EMPTY_QUERY, parseSearchQuery } from './search/parse-query.ts'
import { filterRecipesByQuery, type SearchableRecipe } from './search/filter-recipes.ts'

// Types
interface GetRecipesRequest {
  lineUserId: string
  searchQuery?: string
  ingredientIds?: string[]
  sourceNames?: string[]
  sortOrder?: 'newest' | 'oldest' | 'most_viewed' | 'recently_viewed' | 'shortest_cooking' | 'fewest_ingredients'
}

const SOURCE_NAME_OTHER = '_other'

interface RecipeIngredient {
  id: string
  name: string
  isMain: boolean
}

interface Recipe {
  id: string
  title: string
  url: string
  source_name: string | null
  image_url: string | null
  memo: string | null
  view_count: number
  last_viewed_at: string | null
  created_at: string
  updated_at: string
  cooking_time_minutes: number | null
  ingredients_raw: unknown
}

interface RecipeWithIngredients extends Recipe {
  mainIngredients: RecipeIngredient[]
}

type SortOrder = GetRecipesRequest['sortOrder']
type DbSortOrder = Exclude<NonNullable<SortOrder>, 'fewest_ingredients'>

// Sort configuration (fewest_ingredients はJS側でソートするため除外)
const sortConfig: Record<DbSortOrder, [string, { ascending: boolean }]> = {
  newest: ['created_at', { ascending: false }],
  oldest: ['created_at', { ascending: true }],
  most_viewed: ['view_count', { ascending: false }],
  recently_viewed: ['last_viewed_at', { ascending: false }],
  shortest_cooking: ['cooking_time_minutes', { ascending: true }],
}

// Helper functions
async function getUserId(
  supabase: SupabaseClient,
  lineUserId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single()
  return data?.id ?? null
}

async function fetchRecipes(
  supabase: SupabaseClient,
  userId: string,
  sortOrder: NonNullable<SortOrder>
): Promise<Recipe[]> {
  let query = supabase.from('recipes').select('*').eq('user_id', userId)

  // fewest_ingredients はJS側でソートするため、DBはデフォルト順で取得
  const dbSortOrder: DbSortOrder = sortOrder === 'fewest_ingredients' ? 'newest' : sortOrder
  const [col, opt] = sortConfig[dbSortOrder]
  query = query.order(col, opt)

  const { data, error } = await query
  if (error) throw error

  const recipes = (data ?? []) as Recipe[]

  if (sortOrder === 'fewest_ingredients') {
    return recipes.sort((a, b) => {
      const aLen = Array.isArray(a.ingredients_raw) ? (a.ingredients_raw as unknown[]).length : 999
      const bLen = Array.isArray(b.ingredients_raw) ? (b.ingredients_raw as unknown[]).length : 999
      return aLen - bLen
    })
  }

  return recipes
}

async function fetchRecipeIngredients(
  supabase: SupabaseClient,
  recipeIds: string[]
): Promise<Map<string, RecipeIngredient[]>> {
  if (recipeIds.length === 0) return new Map()

  const { data } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, is_main, ingredients(id, name)')
    .in('recipe_id', recipeIds)
    .eq('is_main', true)

  const map = new Map<string, RecipeIngredient[]>()
  for (const ri of data ?? []) {
    if (!ri.ingredients) continue
    const ing = ri.ingredients as { id: string; name: string }
    const list = map.get(ri.recipe_id) || []
    list.push({ id: ing.id, name: ing.name, isMain: ri.is_main })
    map.set(ri.recipe_id, list)
  }
  return map
}

/** 検索用の食材索引を構築（LINE Bot と同じロジックを共有） */
async function fetchIngredientIndex(supabase: SupabaseClient): Promise<IngredientIndex> {
  const [{ data: ingredients }, { data: aliases }] = await Promise.all([
    supabase.from('ingredients').select('id, name, category, parent_id').eq('needs_review', false),
    supabase.from('ingredient_aliases').select('alias, ingredient_id'),
  ])

  return buildIngredientIndexFromRows(
    (ingredients ?? []) as IngredientRow[],
    (aliases ?? []) as AliasRow[]
  )
}

type SearchableRow = SearchableRecipe & { id: string }

function toSearchable(recipe: RecipeWithIngredients): SearchableRow {
  return {
    id: recipe.id,
    title: recipe.title,
    memo: recipe.memo,
    sourceName: recipe.source_name,
    ingredientsRaw: recipe.ingredients_raw,
    ingredientIds: recipe.mainIngredients.map((i) => i.id),
    ingredientNames: recipe.mainIngredients.map((i) => i.name),
  }
}

/**
 * 検索クエリ + 食材フィルタでレシピを絞り込む
 *
 * 検索文字列は食材条件（グループ内OR / グループ間AND）とテキスト条件（AND）に
 * 分解され、フィルターバーで明示選択された食材IDとは AND で結合される。
 */
async function filterBySearch(
  supabase: SupabaseClient,
  recipes: RecipeWithIngredients[],
  searchQuery: string | undefined,
  ingredientIds: string[]
): Promise<RecipeWithIngredients[]> {
  if (!searchQuery?.trim() && ingredientIds.length === 0) return recipes

  const index = await fetchIngredientIndex(supabase)
  const parsed = searchQuery?.trim() ? parseSearchQuery(index, searchQuery) : EMPTY_QUERY
  // フィルターバーで明示選択された食材は ID 一致のみ（テキスト照合には回さない）
  const selectedGroups = ingredientIds.map((id) => ({
    ids: expandWithChildren(index, [id]),
    text: null,
  }))

  const matchedIds = new Set(
    filterRecipesByQuery(recipes.map(toSearchable), {
      ingredientGroups: [...selectedGroups, ...parsed.ingredientGroups],
      textTerms: parsed.textTerms,
    }).map((r) => r.id)
  )

  return recipes.filter((r) => matchedIds.has(r.id))
}

function extractAvailableSourceNames(recipes: RecipeWithIngredients[]): string[] {
  const names = new Set<string>()
  for (const r of recipes) {
    names.add(r.source_name ?? SOURCE_NAME_OTHER)
  }
  return [...names].sort((a, b) => {
    if (a === SOURCE_NAME_OTHER) return 1
    if (b === SOURCE_NAME_OTHER) return 0
    return a.localeCompare(b, 'ja')
  })
}

function filterBySourceNames(
  recipes: RecipeWithIngredients[],
  sourceNames: string[]
): RecipeWithIngredients[] {
  if (sourceNames.length === 0) return recipes
  const includeOther = sourceNames.includes(SOURCE_NAME_OTHER)
  const realNames = new Set(sourceNames.filter((n) => n !== SOURCE_NAME_OTHER))
  return recipes.filter((r) => {
    if (r.source_name === null) return includeOther
    return realNames.has(r.source_name)
  })
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const timings: Record<string, number> = {}

  try {
    const { lineUserId, searchQuery, ingredientIds = [], sourceNames = [], sortOrder = 'newest' } =
      (await req.json()) as GetRecipesRequest

    if (!lineUserId) {
      return new Response(
        JSON.stringify({ error: 'lineUserId は必須です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get user ID
    let t = Date.now()
    const userId = await getUserId(supabase, lineUserId)
    timings.getUserId = Date.now() - t

    if (!userId) {
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch recipes
    t = Date.now()
    const recipes = await fetchRecipes(supabase, userId, sortOrder)
    timings.fetchRecipes = Date.now() - t

    if (recipes.length === 0) {
      return new Response(
        JSON.stringify({ data: [], availableSourceNames: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Fetch ingredients
    t = Date.now()
    const ingredientMap = await fetchRecipeIngredients(supabase, recipes.map((r) => r.id))
    timings.fetchIngredients = Date.now() - t

    // Attach ingredients to recipes
    const recipesWithIngredients: RecipeWithIngredients[] = recipes.map((r) => ({
      ...r,
      mainIngredients: ingredientMap.get(r.id) || [],
    }))

    // 4. Filter by search query and ingredients
    t = Date.now()
    let result = await filterBySearch(supabase, recipesWithIngredients, searchQuery, ingredientIds)
    timings.filterBySearch = Date.now() - t

    // 5. Extract available source names (before source filtering)
    const availableSourceNames = extractAvailableSourceNames(result)

    // 6. Filter by source names
    t = Date.now()
    result = filterBySourceNames(result, sourceNames)
    timings.filterBySourceNames = Date.now() - t

    timings.total = Date.now() - startTime
    console.log('[get-recipes] Timings:', timings, { recipeCount: result.length })

    return new Response(
      JSON.stringify({ data: result, availableSourceNames }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[get-recipes] Error:', error)
    return new Response(
      JSON.stringify({ error: 'エラーが発生しました' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
