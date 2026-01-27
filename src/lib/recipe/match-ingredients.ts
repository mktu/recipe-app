import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/db/client'
import type { Database, TablesInsert } from '@/types/database'
import { normalizeIngredientName } from './normalize-ingredient'

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

type TypedSupabaseClient = SupabaseClient<Database>

/**
 * レビュー済みのマスター食材を全て取得
 */
async function fetchAllIngredients(supabase: TypedSupabaseClient): Promise<Ingredient[]> {
  const { data } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('needs_review', false)

  return (data ?? []) as Ingredient[]
}

async function findByAlias(
  supabase: TypedSupabaseClient,
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
  supabase: TypedSupabaseClient,
  name: string
): Promise<Ingredient | null> {
  const { data: rows } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('name', name)
    .limit(1)

  return (rows as Ingredient[] | null)?.[0] ?? null
}

/**
 * 部分一致でマッチする食材を検索
 *
 * 優先順位:
 * 1. マスター食材名が入力に含まれる（最長優先）
 *    例: 「豚肉細切れ」に「豚肉」が含まれる → 「豚肉」にマッチ
 * 2. 入力がマスター食材名に含まれる（最短優先）
 *    例: 「豚」が「豚肉」に含まれる → 「豚肉」にマッチ
 */
function findByPartialMatch(
  allIngredients: Ingredient[],
  normalizedName: string
): Ingredient | null {
  // 1. マスター食材名が入力に含まれる（最長優先）
  // 例: 「豚肉細切れ」.includes(「豚肉」) → true
  const containedMatches = allIngredients
    .filter((ing) => normalizedName.includes(ing.name))
    .sort((a, b) => b.name.length - a.name.length) // 長い順

  // 最低2文字以上のマッチを要求（「肉」だけでマッチしないように）
  if (containedMatches.length > 0 && containedMatches[0].name.length >= 2) {
    return containedMatches[0]
  }

  // 2. 入力がマスター食材名に含まれる（最短優先）
  // 例: 「豚肉」.includes(「豚」) → true
  const includingMatches = allIngredients
    .filter((ing) => ing.name.includes(normalizedName))
    .sort((a, b) => a.name.length - b.name.length) // 短い順

  if (includingMatches.length > 0) {
    return includingMatches[0]
  }

  return null
}

async function createIngredient(
  supabase: TypedSupabaseClient,
  name: string
): Promise<Ingredient | null> {
  const ingredientData: TablesInsert<'ingredients'> = { name, category: 'その他', needs_review: true }
  const { data: rows } = await supabase
    .from('ingredients')
    .insert(ingredientData)
    .select('id, name')

  return (rows as Ingredient[] | null)?.[0] ?? null
}

async function matchSingleIngredient(
  supabase: TypedSupabaseClient,
  allIngredients: Ingredient[],
  rawName: string
): Promise<MatchResult | null> {
  // Step 0: 正規化（分量・単位を除去）
  const normalizedName = normalizeIngredientName(rawName)
  if (!normalizedName) return null

  // Step 1: エイリアス検索
  const aliasMatch = await findByAlias(supabase, normalizedName)
  if (aliasMatch) {
    return { ingredientId: aliasMatch.id, name: aliasMatch.name, isNew: false }
  }

  // Step 2: 完全一致検索
  const exactMatch = await findByExactMatch(supabase, normalizedName)
  if (exactMatch) {
    return { ingredientId: exactMatch.id, name: exactMatch.name, isNew: false }
  }

  // Step 3: 部分一致検索
  const partialMatch = findByPartialMatch(allIngredients, normalizedName)
  if (partialMatch) {
    return {
      ingredientId: partialMatch.id,
      name: partialMatch.name,
      isNew: false,
    }
  }

  // Step 4: 新規作成（マッチしなかった場合）
  const newIngredient = await createIngredient(supabase, normalizedName)
  if (newIngredient) {
    return {
      ingredientId: newIngredient.id,
      name: newIngredient.name,
      isNew: true,
    }
  }

  return null
}

export async function matchIngredients(
  ingredientNames: string[]
): Promise<MatchResult[]> {
  if (ingredientNames.length === 0) return []

  const supabase = createServerClient()

  // マスター食材を一度だけ取得して使い回す
  const allIngredients = await fetchAllIngredients(supabase)

  const results: MatchResult[] = []
  for (const name of ingredientNames) {
    if (!name.trim()) continue

    const result = await matchSingleIngredient(supabase, allIngredients, name)
    if (result) results.push(result)
  }

  return results
}
