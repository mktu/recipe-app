import { createServerClient } from '@/lib/db/client'

export interface MatchResult {
  ingredientId: string
  name: string
  isNew: boolean
}

interface Ingredient {
  id: string
  name: string
}

interface IngredientAlias {
  ingredient_id: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

async function findByAlias(
  supabase: SupabaseClient,
  name: string
): Promise<Ingredient | null> {
  const { data: aliasRows } = await supabase
    .from('ingredient_aliases')
    .select('ingredient_id')
    .eq('alias', name)
    .limit(1)

  const aliasRow = (aliasRows as IngredientAlias[] | null)?.[0]
  if (!aliasRow) return null

  const { data: ingredientRows } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('id', aliasRow.ingredient_id)
    .limit(1)

  return (ingredientRows as Ingredient[] | null)?.[0] ?? null
}

async function findByExactMatch(
  supabase: SupabaseClient,
  name: string
): Promise<Ingredient | null> {
  const { data: rows } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('name', name)
    .limit(1)

  return (rows as Ingredient[] | null)?.[0] ?? null
}

async function createIngredient(
  supabase: SupabaseClient,
  name: string
): Promise<Ingredient | null> {
  const { data: rows } = await supabase
    .from('ingredients')
    .insert({ name, category: 'その他', needs_review: true })
    .select('id, name')

  return (rows as Ingredient[] | null)?.[0] ?? null
}

async function matchSingleIngredient(
  supabase: SupabaseClient,
  name: string
): Promise<MatchResult | null> {
  // Step 1: エイリアス検索
  const aliasMatch = await findByAlias(supabase, name)
  if (aliasMatch) {
    return { ingredientId: aliasMatch.id, name: aliasMatch.name, isNew: false }
  }

  // Step 2: 完全一致検索
  const exactMatch = await findByExactMatch(supabase, name)
  if (exactMatch) {
    return { ingredientId: exactMatch.id, name: exactMatch.name, isNew: false }
  }

  // Step 3: 新規作成
  const newIngredient = await createIngredient(supabase, name)
  if (newIngredient) {
    return { ingredientId: newIngredient.id, name: newIngredient.name, isNew: true }
  }

  return null
}

export async function matchIngredients(
  ingredientNames: string[]
): Promise<MatchResult[]> {
  if (ingredientNames.length === 0) return []

  const supabase = createServerClient()
  const results: MatchResult[] = []

  for (const name of ingredientNames) {
    const normalizedName = name.trim()
    if (!normalizedName) continue

    const result = await matchSingleIngredient(supabase, normalizedName)
    if (result) results.push(result)
  }

  return results
}
