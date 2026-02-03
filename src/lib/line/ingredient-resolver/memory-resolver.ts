import { createServerClient } from '@/lib/db/client'
import type { IngredientResolver, ResolvedIngredient } from './types'

interface IngredientRow {
  id: string
  name: string
}

interface AliasRow {
  ingredient_id: string
  alias: string
  ingredients: { name: string } | null
}

/**
 * 食材マスターとエイリアスをDBから取得
 */
async function fetchIngredientData(): Promise<Map<string, ResolvedIngredient>> {
  const supabase = createServerClient()
  const map = new Map<string, ResolvedIngredient>()

  // 食材マスターを取得
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('needs_review', false)

  for (const ing of (ingredients ?? []) as IngredientRow[]) {
    map.set(ing.name, { id: ing.id, name: ing.name })
  }

  // エイリアスを取得
  const { data: aliases } = await supabase
    .from('ingredient_aliases')
    .select('ingredient_id, alias, ingredients(name)')

  for (const a of (aliases ?? []) as AliasRow[]) {
    if (a.ingredients?.name) {
      map.set(a.alias, { id: a.ingredient_id, name: a.ingredients.name })
    }
  }

  return map
}

/**
 * メモリ上のMapで食材を検索するResolver
 *
 * 特徴:
 * - 食材マスター + エイリアスを1回のリクエストで取得
 * - 完全一致のみ（O(1)検索）
 * - リクエストごとにDBから取得（キャッシュなし）
 */
export function createMemoryResolver(): IngredientResolver {
  let ingredientMap: Map<string, ResolvedIngredient> | null = null

  return {
    async resolve(word: string): Promise<ResolvedIngredient | null> {
      // 初回のみDBから取得（同一リクエスト内で再利用）
      if (!ingredientMap) {
        ingredientMap = await fetchIngredientData()
      }
      return ingredientMap.get(word) ?? null
    },
  }
}
