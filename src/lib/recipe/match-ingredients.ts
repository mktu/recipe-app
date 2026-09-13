import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/db/client'
import type { Database } from '@/types/database'
import type { UnmatchedIngredient } from '@/types/recipe'
import { normalizeIngredientName, splitIngredientNames } from './normalize-ingredient'
import { isSeasoning } from './seasonings'

export interface MatchResult {
  ingredientId: string
  name: string
}

export interface MatchIngredientsOptions {
  recipeId?: string  // 未マッチ記録用（どのレシピからの食材か）
}

export interface ResolveIngredientsResult {
  matched: MatchResult[]
  unmatched: UnmatchedIngredient[]
}

interface Ingredient {
  id: string
  name: string
}

type TypedSupabaseClient = SupabaseClient<Database>

/**
 * 分割済みの1断片を処理してマッチ結果を results に追加する。
 * アンマッチの場合は未マッチ記録用の normalizedName を返す。
 */
function processNamePart(
  part: string,
  allIngredients: Ingredient[],
  ingredientIdMap: Map<string, Ingredient>,
  aliasMap: Map<string, string>,
  seen: Set<string>,
  results: MatchResult[],
): string | null {
  const normalizedName = normalizeIngredientName(part)
  const matched = matchSingleIngredient(allIngredients, ingredientIdMap, aliasMap, part)
  if (matched) {
    if (!seen.has(matched.id)) {
      seen.add(matched.id)
      results.push({ ingredientId: matched.id, name: matched.name })
    }
    return null
  }
  if (normalizedName && !isSeasoning(normalizedName)) {
    return normalizedName
  }
  return null
}

/**
 * 1エントリを処理してマッチ結果を results に追加する。
 * 「細ネギ小口切り、七味」のように複数食材が並記されている場合は分割して個別に扱う。
 * アンマッチの場合は未マッチ記録用の normalizedName を返す（分割時は複数件）。
 */
function processSingleName(
  name: string,
  allIngredients: Ingredient[],
  ingredientIdMap: Map<string, Ingredient>,
  aliasMap: Map<string, string>,
  seen: Set<string>,
  results: MatchResult[],
): string[] {
  const unmatched: string[] = []
  for (const part of splitIngredientNames(name)) {
    const normalizedName = processNamePart(
      part, allIngredients, ingredientIdMap, aliasMap, seen, results
    )
    if (normalizedName) unmatched.push(normalizedName)
  }
  return unmatched
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

/**
 * 食材名を解決して結果を返す。**DB への書き込みは行わない。**
 *
 * 未マッチ食材をどこに記録するかが呼び出し側で変わるため、判定と記録を分けている。
 * レシピノートの経路はレシピ行と同じトランザクションで記録したいので、この戻り値を
 * そのまま RPC に渡す（Issue #173）。
 */
export async function resolveIngredients(
  ingredientNames: string[]
): Promise<ResolveIngredientsResult> {
  if (ingredientNames.length === 0) return { matched: [], unmatched: [] }

  const supabase = createServerClient()

  // ingredients と aliases を2クエリで一括取得
  const { allIngredients, aliasMap } = await fetchIngredientMaps(supabase)

  // id → ingredient の Map（エイリアス解決用）
  const ingredientIdMap = new Map<string, Ingredient>(
    allIngredients.map((ing) => [ing.id, ing])
  )

  const matched: MatchResult[] = []
  const unmatched: UnmatchedIngredient[] = []
  const seen = new Set<string>()

  for (const name of ingredientNames) {
    const normalizedNames = processSingleName(name, allIngredients, ingredientIdMap, aliasMap, seen, matched)
    for (const normalizedName of normalizedNames) {
      // rawName は分割前の元エントリ。従来の記録内容をそのまま維持している
      unmatched.push({ rawName: name, normalizedName })
    }
  }

  return { matched, unmatched }
}

/** 食材をマッチングし、未マッチ分を unmatched_ingredients に記録する */
export async function matchIngredients(
  ingredientNames: string[],
  options: MatchIngredientsOptions = {}
): Promise<MatchResult[]> {
  const { matched, unmatched } = await resolveIngredients(ingredientNames)

  if (unmatched.length > 0) {
    const supabase = createServerClient()
    await Promise.all(
      unmatched.map(({ rawName, normalizedName }) =>
        recordUnmatchedIngredient(supabase, rawName, normalizedName, options.recipeId)
      )
    )
  }

  return matched
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
      for (const normalizedName of unmatched) {
        unmatchedPromises.push(
          recordUnmatchedIngredient(supabase, name, normalizedName, recipeId)
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
