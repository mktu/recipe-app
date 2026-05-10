import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/db/client'
import type { Database } from '@/types/database'
import { normalizeIngredientName } from './normalize-ingredient'

/** 検索対象外とする調味料・基礎食材・お菓子材料 */
const SEASONING_KEYWORDS = [
  // 基本調味料
  '塩', '砂糖', 'グラニュー糖', '醤油', 'しょうゆ', 'みりん', '酒', '料理酒',
  '油', 'サラダ油', 'ごま油', 'オリーブオイル', 'オリーブ油',
  '酢', '味噌', 'みそ', 'だし', '出汁', 'ダシ', 'めんつゆ',
  'マヨネーズ', 'ケチャップ', 'ソース', 'ウスターソース',
  'こしょう', 'コショウ', '胡椒', '塩こしょう', '黒こしょう',
  '片栗粉', '薄力粉', '強力粉', '小麦粉', 'パン粉',
  'コンソメ', 'ブイヨン', '鶏ガラスープ',
  'ねぎ刻み', '細ねぎ', '細ねぎ刻み',
  // 辛味調味料
  '豆板醤', 'コチュジャン', 'はちみつ',
  // お菓子材料
  'ホットケーキミックス', 'ベーキングパウダー', 'ココアパウダー', 'ビスケット',
  // その他
  'お湯', '水',
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

type TypedSupabaseClient = SupabaseClient<Database>

/**
 * 1食材を処理してマッチ結果を results に追加する。
 * アンマッチの場合は未マッチ記録用の normalizedName を返す。
 */
function processSingleName(
  name: string,
  allIngredients: Ingredient[],
  ingredientIdMap: Map<string, Ingredient>,
  aliasMap: Map<string, string>,
  seen: Set<string>,
  results: MatchResult[],
): string | null {
  if (!name.trim()) return null
  const normalizedName = normalizeIngredientName(name)
  const matched = matchSingleIngredient(allIngredients, ingredientIdMap, aliasMap, name)
  if (matched && !seen.has(matched.id)) {
    seen.add(matched.id)
    results.push({ ingredientId: matched.id, name: matched.name })
    return null
  }
  if (!matched && normalizedName && !isSeasoning(normalizedName)) {
    return normalizedName
  }
  return null
}

/** ingredients と ingredient_aliases を一括フェッチしてインメモリ検索用データを構築 */
async function fetchIngredientMaps(supabase: TypedSupabaseClient): Promise<{
  allIngredients: Ingredient[]
  aliasMap: Map<string, string>  // alias → ingredient_id
}> {
  const [{ data: ingredientsData }, { data: aliasesData }] = await Promise.all([
    supabase.from('ingredients').select('id, name').eq('needs_review', false),
    supabase.from('ingredient_aliases').select('alias, ingredient_id'),
  ])

  const allIngredients = (ingredientsData ?? []) as Ingredient[]
  const aliasMap = new Map<string, string>(
    (aliasesData ?? []).map((row) => [row.alias as string, row.ingredient_id as string])
  )

  return { allIngredients, aliasMap }
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
  const containedMatches = allIngredients
    .filter((ing) => normalizedName.includes(ing.name))
    .sort((a, b) => b.name.length - a.name.length)

  // 最低2文字以上のマッチを要求（「肉」だけでマッチしないように）
  if (containedMatches.length > 0 && containedMatches[0].name.length >= 2) {
    return containedMatches[0]
  }

  // 2. 入力がマスター食材名に含まれる（最短優先）
  const includingMatches = allIngredients
    .filter((ing) => ing.name.includes(normalizedName))
    .sort((a, b) => a.name.length - b.name.length)

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

function matchSingleIngredient(
  allIngredients: Ingredient[],
  ingredientIdMap: Map<string, Ingredient>,
  aliasMap: Map<string, string>,
  rawName: string
): Ingredient | null {
  // Step 0: 正規化（分量・単位を除去）
  const normalizedName = normalizeIngredientName(rawName)
  if (!normalizedName) return null

  // Step 0.5: 調味料は除外（マッチ対象外）
  if (isSeasoning(normalizedName)) return null

  // Step 1: エイリアス検索（インメモリ）
  const aliasedId = aliasMap.get(normalizedName)
  if (aliasedId) {
    const ing = ingredientIdMap.get(aliasedId)
    if (ing) return ing
  }

  // Step 2: 完全一致検索（インメモリ）
  const exactMatch = allIngredients.find((ing) => ing.name === normalizedName) ?? null
  if (exactMatch) return exactMatch

  // Step 3: 部分一致検索（インメモリ）
  return findByPartialMatch(allIngredients, normalizedName)
}

export async function matchIngredients(
  ingredientNames: string[],
  options: MatchIngredientsOptions = {}
): Promise<MatchResult[]> {
  if (ingredientNames.length === 0) return []

  const supabase = createServerClient()

  // ingredients と aliases を2クエリで一括取得
  const { allIngredients, aliasMap } = await fetchIngredientMaps(supabase)

  // id → ingredient の Map（エイリアス解決用）
  const ingredientIdMap = new Map<string, Ingredient>(
    allIngredients.map((ing) => [ing.id, ing])
  )

  const results: MatchResult[] = []
  const seen = new Set<string>()
  const unmatchedPromises: Promise<void>[] = []

  for (const name of ingredientNames) {
    const unmatched = processSingleName(name, allIngredients, ingredientIdMap, aliasMap, seen, results)
    if (unmatched) {
      unmatchedPromises.push(
        recordUnmatchedIngredient(supabase, name, unmatched, options.recipeId)
      )
    }
  }

  if (unmatchedPromises.length > 0) {
    await Promise.all(unmatchedPromises)
  }

  return results
}

/** 複数レシピ分を一括でマッチングする（DBクエリを2回のみに抑える） */
export async function matchIngredientsForRecipes(
  recipes: Array<{ recipeId: string; ingredientNames: string[] }>
): Promise<Map<string, MatchResult[]>> {
  const supabase = createServerClient()

  const { allIngredients, aliasMap } = await fetchIngredientMaps(supabase)

  const ingredientIdMap = new Map<string, Ingredient>(
    allIngredients.map((ing) => [ing.id, ing])
  )

  const unmatchedPromises: Promise<void>[] = []
  const resultMap = new Map<string, MatchResult[]>()

  for (const { recipeId, ingredientNames } of recipes) {
    const results: MatchResult[] = []
    const seen = new Set<string>()

    for (const name of ingredientNames) {
      const unmatched = processSingleName(name, allIngredients, ingredientIdMap, aliasMap, seen, results)
      if (unmatched) {
        unmatchedPromises.push(
          recordUnmatchedIngredient(supabase, name, unmatched, recipeId)
        )
      }
    }

    resultMap.set(recipeId, results)
  }

  if (unmatchedPromises.length > 0) {
    await Promise.all(unmatchedPromises)
  }

  return resultMap
}
