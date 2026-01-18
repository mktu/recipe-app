import { createServerClient } from '@/lib/db/client'
import type { SortOrder, RecipeWithIngredients, RecipeIngredient } from '@/types/recipe'
import { NextRequest, NextResponse } from 'next/server'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserId(supabase: any, lineUserId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('id').eq('line_user_id', lineUserId).single()
  return data?.id ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchRecipes(supabase: any, userId: string, searchQuery: string | undefined, sortOrder: SortOrder) {
  let query = supabase.from('recipes').select('*').eq('user_id', userId)
  if (searchQuery?.trim()) {
    const term = `%${searchQuery.trim()}%`
    query = query.or(`title.ilike.${term},memo.ilike.${term},source_name.ilike.${term}`)
  }
  const [col, opt] = sortConfig[sortOrder]
  return query.order(col, opt)
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

function filterByIngredients(recipes: RecipeWithIngredients[], ingredientIds: string[]): RecipeWithIngredients[] {
  if (ingredientIds.length === 0) return recipes
  return recipes.filter((r) => ingredientIds.every((id) => r.mainIngredients.some((i) => i.id === id)))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchRecipeIngredients(supabase: any, recipeIds: string[]): Promise<Map<string, RecipeIngredient[]>> {
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, is_main, ingredients(id, name)')
    .in('recipe_id', recipeIds)
    .eq('is_main', true)
  return buildIngredientMap((data || []) as RecipeIngredientRow[])
}

function attachIngredients(recipes: RecipeWithIngredients[], ingredientMap: Map<string, RecipeIngredient[]>): RecipeWithIngredients[] {
  return recipes.map((r) => ({ ...r, mainIngredients: ingredientMap.get(r.id) || [] }))
}

export async function POST(request: NextRequest) {
  const { lineUserId, searchQuery, ingredientIds = [], sortOrder = 'newest' } = (await request.json()) as ListRecipesRequest
  if (!lineUserId) return NextResponse.json({ error: 'lineUserId は必須です' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  try {
    const userId = await getUserId(supabase, lineUserId)
    if (!userId) return NextResponse.json({ data: [] })

    const { data: recipes, error } = await fetchRecipes(supabase, userId, searchQuery, sortOrder)
    if (error) throw error
    if (!recipes?.length) return NextResponse.json({ data: [] })

    const ingredientMap = await fetchRecipeIngredients(supabase, recipes.map((r: { id: string }) => r.id))
    const result = attachIngredients(recipes, ingredientMap)
    return NextResponse.json({ data: filterByIngredients(result, ingredientIds) })
  } catch (err) {
    console.error('[POST /api/recipes/list] Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
