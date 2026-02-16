/**
 * レシピ一覧取得 Edge Function
 *
 * Vercel API Route から呼び出され、レシピ一覧を返す。
 * Edge Function と DB が同一リージョンにあるため、
 * 複数クエリでも低レイテンシで実行できる。
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Types
interface GetRecipesRequest {
  lineUserId: string
  searchQuery?: string
  ingredientIds?: string[]
  sortOrder?: 'newest' | 'oldest' | 'most_viewed' | 'recently_viewed'
}

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
}

interface RecipeWithIngredients extends Recipe {
  mainIngredients: RecipeIngredient[]
}

type SortOrder = GetRecipesRequest['sortOrder']

// Sort configuration
const sortConfig: Record<NonNullable<SortOrder>, [string, { ascending: boolean }]> = {
  newest: ['created_at', { ascending: false }],
  oldest: ['created_at', { ascending: true }],
  most_viewed: ['view_count', { ascending: false }],
  recently_viewed: ['last_viewed_at', { ascending: false }],
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
  searchQuery: string | undefined,
  sortOrder: NonNullable<SortOrder>
): Promise<Recipe[]> {
  let query = supabase.from('recipes').select('*').eq('user_id', userId)

  if (searchQuery?.trim()) {
    const term = `%${searchQuery.trim()}%`
    query = query.or(`title.ilike.${term},memo.ilike.${term},source_name.ilike.${term}`)
  }

  const [col, opt] = sortConfig[sortOrder]
  query = query.order(col, opt)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Recipe[]
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

async function getIngredientAndChildIds(
  supabase: SupabaseClient,
  ingredientIds: string[]
): Promise<Map<string, string[]>> {
  if (ingredientIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('ingredients')
    .select('id, parent_id')
    .or(`id.in.(${ingredientIds.join(',')}),parent_id.in.(${ingredientIds.join(',')})`)

  if (error) {
    console.error('[getIngredientAndChildIds] Error:', error)
    return new Map(ingredientIds.map((id) => [id, [id]]))
  }

  const rows = (data ?? []) as { id: string; parent_id: string | null }[]
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

function filterByIngredients(
  recipes: RecipeWithIngredients[],
  ingredientIds: string[],
  expandedIdsMap: Map<string, string[]>
): RecipeWithIngredients[] {
  if (ingredientIds.length === 0) return recipes

  return recipes.filter((recipe) => {
    const recipeIngredientIds = recipe.mainIngredients.map((i) => i.id)
    return ingredientIds.every((searchId) => {
      const expandedIds = expandedIdsMap.get(searchId) || [searchId]
      return expandedIds.some((id) => recipeIngredientIds.includes(id))
    })
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
    const { lineUserId, searchQuery, ingredientIds = [], sortOrder = 'newest' } =
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
    const recipes = await fetchRecipes(supabase, userId, searchQuery, sortOrder)
    timings.fetchRecipes = Date.now() - t

    if (recipes.length === 0) {
      return new Response(
        JSON.stringify({ data: [] }),
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

    // 4. Filter by ingredients if needed
    t = Date.now()
    let result = recipesWithIngredients
    if (ingredientIds.length > 0) {
      const expandedIdsMap = await getIngredientAndChildIds(supabase, ingredientIds)
      result = filterByIngredients(recipesWithIngredients, ingredientIds, expandedIdsMap)
    }
    timings.filterByIngredients = Date.now() - t

    timings.total = Date.now() - startTime
    console.log('[get-recipes] Timings:', timings, { recipeCount: result.length })

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[get-recipes] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
