import { supabase } from '@/lib/db/client'
import type { Tables } from '@/types/database'
import type { SortOrder, RecipeWithIngredients, RecipeIngredient } from '@/types/recipe'
import { getVectorSearchIds } from './recipe-embedding'

const MIN_ILIKE_RESULTS = 3

export interface FetchRecipesParams {
  userId: string
  searchQuery?: string
  ingredientIds?: string[]
  sourceNames?: string[]
  sortOrder?: SortOrder
}

const SOURCE_NAME_OTHER = '_other'

type RecipeIngredientRow = {
  recipe_id: string
  ingredient_id: string
  is_main: boolean
  ingredients: { id: string; name: string } | null
}

type IngredientWithParent = {
  id: string
  parent_id: string | null
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
  const result = new Map<string, string[]>()
  for (const searchId of ingredientIds) {
    const matchingIds = rows
      .filter((row) => row.id === searchId || row.parent_id === searchId)
      .map((row) => row.id)
    if (!matchingIds.includes(searchId)) matchingIds.push(searchId)
    result.set(searchId, matchingIds)
  }
  return result
}

async function filterByIngredients(
  recipes: RecipeWithIngredients[],
  ingredientIds: string[]
): Promise<RecipeWithIngredients[]> {
  if (ingredientIds.length === 0) return recipes
  const expandedIdsMap = await getIngredientAndChildIds(ingredientIds)
  return recipes.filter((recipe) => {
    const recipeIngredientIds = recipe.mainIngredients.map((i) => i.id)
    return ingredientIds.every((searchId) => {
      const expandedIds = expandedIdsMap.get(searchId) || [searchId]
      return expandedIds.some((id) => recipeIngredientIds.includes(id))
    })
  })
}

type DbSortOrder = Exclude<SortOrder, 'fewest_ingredients'>

const DB_SORT_OPTS: Record<DbSortOrder, [string, object]> = {
  newest: ['created_at', { ascending: false }],
  oldest: ['created_at', { ascending: true }],
  most_viewed: ['view_count', { ascending: false }],
  recently_viewed: ['last_viewed_at', { ascending: false, nullsFirst: false }],
  shortest_cooking: ['cooking_time_minutes', { ascending: true, nullsFirst: false }],
}

function applySortOrder<T>(query: T, sortOrder: SortOrder): T {
  const q = query as { order: (col: string, opts: object) => T }
  const dbSortOrder: DbSortOrder = sortOrder === 'fewest_ingredients' ? 'newest' : sortOrder
  const [col, opt] = DB_SORT_OPTS[dbSortOrder]
  return q.order(col, opt)
}

function sortByIngredientCount(recipes: Tables<'recipes'>[]): Tables<'recipes'>[] {
  return [...recipes].sort((a, b) => {
    const aLen = Array.isArray(a.ingredients_raw) ? a.ingredients_raw.length : 999
    const bLen = Array.isArray(b.ingredients_raw) ? b.ingredients_raw.length : 999
    return aLen - bLen
  })
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

async function searchRecipesHybrid(userId: string, searchQuery: string, sortOrder: SortOrder): Promise<Tables<'recipes'>[]> {
  const term = `%${searchQuery}%`
  let query = supabase.from('recipes').select('*').eq('user_id', userId)
    .or(`title.ilike.${term},memo.ilike.${term},source_name.ilike.${term}`)
  query = applySortOrder(query, sortOrder)
  const { data, error } = await query
  if (error) throw error
  const ilikeRecipes = (data ?? []) as Tables<'recipes'>[]
  if (ilikeRecipes.length >= MIN_ILIKE_RESULTS) return ilikeRecipes

  try {
    const additionalIds = await getVectorSearchIds(supabase, userId, searchQuery, ilikeRecipes.map((r) => r.id), 20)
    if (additionalIds.length > 0) {
      const { data: extra } = await supabase.from('recipes').select('*').in('id', additionalIds)
      return [...ilikeRecipes, ...((extra ?? []) as Tables<'recipes'>[])]
    }
  } catch (e) { console.error('[searchRecipesHybrid] Vector search failed:', e) }
  return ilikeRecipes
}

async function fetchRecipesFromDb(
  userId: string,
  searchQuery: string | undefined,
  sortOrder: SortOrder
): Promise<Tables<'recipes'>[]> {
  let recipes: Tables<'recipes'>[]
  if (!searchQuery?.trim()) {
    let query = supabase.from('recipes').select('*').eq('user_id', userId)
    query = applySortOrder(query, sortOrder)
    const { data, error } = await query
    if (error) throw error
    recipes = (data ?? []) as Tables<'recipes'>[]
  } else {
    recipes = await searchRecipesHybrid(userId, searchQuery.trim(), sortOrder)
  }
  return sortOrder === 'fewest_ingredients' ? sortByIngredientCount(recipes) : recipes
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

interface FetchRecipesResult {
  data: RecipeWithIngredients[]
  availableSourceNames: string[]
  error: Error | null
}

/** ユーザーのレシピ一覧を取得 */
export async function fetchRecipes(params: FetchRecipesParams): Promise<FetchRecipesResult> {
  const { userId: lineUserId, searchQuery, ingredientIds = [], sourceNames = [], sortOrder = 'newest' } = params
  const emptyResult = { data: [], availableSourceNames: [], error: null }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single()

    if (!user) return emptyResult

    const userId = (user as { id: string }).id
    const recipes = await fetchRecipesFromDb(userId, searchQuery, sortOrder)
    if (recipes.length === 0) return emptyResult

    const ingredientMap = await fetchIngredientMap(recipes.map((r) => r.id))
    const withIngredients = recipes.map((r) => ({ ...r, mainIngredients: ingredientMap.get(r.id) || [] }))
    const afterIngredientFilter = await filterByIngredients(withIngredients, ingredientIds)

    const availableSourceNames = extractAvailableSourceNames(afterIngredientFilter)
    const data = filterBySourceNames(afterIngredientFilter, sourceNames)

    return { data, availableSourceNames, error: null }
  } catch (err) {
    return { ...emptyResult, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
