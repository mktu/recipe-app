import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  buildIngredientIndex,
  type AliasRecord,
  type IngredientIndex,
  type IngredientRecord,
} from '@/lib/search/ingredient-index'

type TypedSupabaseClient = SupabaseClient<Database>

/**
 * 検索用の食材索引を DB から構築する
 *
 * 食材マスタとエイリアスを 2 クエリで一括取得する。
 * needs_review の食材は検索対象外（誤登録の可能性があるため）。
 */
export async function fetchIngredientIndex(
  client: TypedSupabaseClient
): Promise<IngredientIndex> {
  const [{ data: ingredients }, { data: aliases }] = await Promise.all([
    client.from('ingredients').select('id, name, category, parent_id').eq('needs_review', false),
    client.from('ingredient_aliases').select('alias, ingredient_id'),
  ])

  const ingredientRecords: IngredientRecord[] = (ingredients ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    parentId: row.parent_id,
  }))

  const aliasRecords: AliasRecord[] = (aliases ?? []).map((row) => ({
    alias: row.alias,
    ingredientId: row.ingredient_id,
  }))

  return buildIngredientIndex(ingredientRecords, aliasRecords)
}
