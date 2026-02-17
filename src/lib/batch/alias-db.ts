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

export async function insertNewIngredient(
  supabase: SupabaseClient,
  name: string,
  category: string
): Promise<string | null> {
  const validCategory = VALID_CATEGORIES.includes(category)
    ? category
    : DEFAULT_CATEGORY

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      name,
      category: validCategory,
      needs_review: true,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      console.log(`[insertNewIngredient] Already exists: ${name}`)
      return null
    }
    console.error('[insertNewIngredient] Error:', error)
    return null
  }

  return data?.id ?? null
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
