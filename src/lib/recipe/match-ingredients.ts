import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/db/client'
import type { Database } from '@/types/database'
import { normalizeIngredientName } from './normalize-ingredient'

/** 検索対象外とする調味料・基礎食材 */
const SEASONING_KEYWORDS = [
  '塩', '砂糖', '醤油', 'しょうゆ', 'みりん', '酒', '料理酒',
  '油', 'サラダ油', 'ごま油', 'オリーブオイル', 'オリーブ油',
  '酢', '味噌', 'みそ', 'だし', '出汁', 'ダシ',
  'マヨネーズ', 'ケチャップ', 'ソース', 'ウスターソース',
  'こしょう', 'コショウ', '胡椒', '塩こしょう', '黒こしょう',
  '片栗粉', '薄力粉', '強力粉', '小麦粉', 'パン粉',
  'コンソメ', 'ブイヨン', '鶏ガラスープ',
  '溶き卵', 'ねぎ刻み', '細ねぎ', '細ねぎ刻み',
]

function isSeasoning(name: string): boolean {
  const normalized = name.toLowerCase()
  return SEASONING_KEYWORDS.some((kw) => normalized.includes(kw))
}

export interface MatchResult {
  ingredientId: string
  name: string
}

export interface MatchIngredientsOptions {
  recipeId?: string  // 未マッチ記録用（どのレシピからの食材か）
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

/**
 * マッチしなかった食材を記録（後からエイリアス登録やLLMフォールバックの判断材料に）
 */
async function recordUnmatchedIngredient(
  supabase: TypedSupabaseClient,
  rawName: string,
  normalizedName: string,
  recipeId?: string
): Promise<void> {
  await supabase.from('unmatched_ingredients').insert({
    raw_name: rawName,
    normalized_name: normalizedName,
    recipe_id: recipeId ?? null,
  })
}

async function matchSingleIngredient(
  supabase: TypedSupabaseClient,
  allIngredients: Ingredient[],
  rawName: string,
  recipeId?: string
): Promise<MatchResult | null> {
  // Step 0: 正規化（分量・単位を除去）
  const normalizedName = normalizeIngredientName(rawName)
  if (!normalizedName) return null

  // Step 0.5: 調味料は除外（マッチ対象外）
  if (isSeasoning(normalizedName)) return null

  // Step 1: エイリアス検索
  const aliasMatch = await findByAlias(supabase, normalizedName)
  if (aliasMatch) {
    return { ingredientId: aliasMatch.id, name: aliasMatch.name }
  }

  // Step 2: 完全一致検索
  const exactMatch = await findByExactMatch(supabase, normalizedName)
  if (exactMatch) {
    return { ingredientId: exactMatch.id, name: exactMatch.name }
  }

  // Step 3: 部分一致検索
  const partialMatch = findByPartialMatch(allIngredients, normalizedName)
  if (partialMatch) {
    return {
      ingredientId: partialMatch.id,
      name: partialMatch.name,
    }
  }

  // Step 4: 未マッチを記録（ingredientsには追加しない）
  // → 後からエイリアス登録やLLMフォールバックの判断材料に
  await recordUnmatchedIngredient(supabase, rawName, normalizedName, recipeId)

  return null
}

export async function matchIngredients(
  ingredientNames: string[],
  options: MatchIngredientsOptions = {}
): Promise<MatchResult[]> {
  if (ingredientNames.length === 0) return []

  const supabase = createServerClient()

  // マスター食材を一度だけ取得して使い回す
  const allIngredients = await fetchAllIngredients(supabase)

  const results: MatchResult[] = []
  for (const name of ingredientNames) {
    if (!name.trim()) continue

    const result = await matchSingleIngredient(
      supabase,
      allIngredients,
      name,
      options.recipeId
    )
    if (result) results.push(result)
  }

  return results
}
