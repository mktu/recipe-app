/**
 * 食材エイリアス自動生成 - DB操作
 */

import { SupabaseClient } from '@supabase/supabase-js'

/** カテゴリのデフォルト値 */
const DEFAULT_CATEGORY = 'その他'

/** 有効なカテゴリ一覧 */
const VALID_CATEGORIES = [
  '野菜',
  '肉',
  '魚介',
  'きのこ',
  '卵・乳製品',
  '豆腐・大豆製品',
  '穀物・麺類',
  'その他',
]

export interface UnmatchedIngredient {
  normalized_name: string
  count: number
}

export interface MasterIngredient {
  id: string
  name: string
}

export async function fetchUnmatchedIngredients(
  supabase: SupabaseClient,
  limit: number
): Promise<UnmatchedIngredient[]> {
  const { data, error } = await supabase.rpc('get_unmatched_ingredient_counts', {
    limit_count: limit,
  })

  if (error) {
    console.error('[fetchUnmatchedIngredients] Error:', error)
    return []
  }

  return (data ?? []) as UnmatchedIngredient[]
}

export async function fetchMasterIngredients(
  supabase: SupabaseClient
): Promise<MasterIngredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('needs_review', false)

  if (error) {
    console.error('[fetchMasterIngredients] Error:', error)
    return []
  }

  return (data ?? []) as MasterIngredient[]
}

export async function insertAlias(
  supabase: SupabaseClient,
  alias: string,
  ingredientId: string
): Promise<boolean> {
  const { error } = await supabase.from('ingredient_aliases').insert({
    alias,
    ingredient_id: ingredientId,
    auto_generated: true,
  })

  if (error) {
    if (error.code === '23505') {
      console.log(`[insertAlias] Already exists: ${alias}`)
      return true
    }
    console.error('[insertAlias] Error:', error)
    return false
  }

  return true
}

/**
 * 新規食材の追加結果
 *
 * 重複（23505）を含む失敗を呼び出し元がバッチ結果に計上できるよう、
 * ID だけでなく失敗理由も返す（Issue #148）
 */
export interface InsertIngredientResult {
  id: string | null
  error: string | null
}

/**
 * LLM が「新規食材」と判定したものを食材マスターに追加する
 *
 * needs_review は付けない。付けるとマッチング・検索・LLM に渡すマスタ一覧の
 * すべてから除外され、同じ食材が来るたびに LLM 判定 → 重複エラーを繰り返す
 * 行き止まりになるため（Issue #148）。自動追加であることは auto_generated で識別し、
 * 妥当性は事後監査で担保する。
 */
export async function insertNewIngredient(
  supabase: SupabaseClient,
  name: string,
  category: string
): Promise<InsertIngredientResult> {
  const validCategory = VALID_CATEGORIES.includes(category)
    ? category
    : DEFAULT_CATEGORY

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      name,
      category: validCategory,
      needs_review: false,
      auto_generated: true,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = name の UNIQUE 違反。マスタに既にある食材が未マッチとして再来した合図で、
    // マッチャーの取りこぼしを示すためエラーとして計上する
    if (error.code === '23505') {
      console.error(`[insertNewIngredient] Already exists: ${name}`)
      return { id: null, error: `Ingredient already exists: ${name}` }
    }
    console.error('[insertNewIngredient] Error:', error)
    return { id: null, error: `Failed to insert ingredient: ${name} (${error.message})` }
  }

  return { id: data?.id ?? null, error: null }
}

export async function deleteProcessedUnmatched(
  supabase: SupabaseClient,
  normalizedNames: string[]
): Promise<void> {
  if (normalizedNames.length === 0) return

  const { error } = await supabase
    .from('unmatched_ingredients')
    .delete()
    .in('normalized_name', normalizedNames)

  if (error) {
    console.error('[deleteProcessedUnmatched] Error:', error)
  }
}
