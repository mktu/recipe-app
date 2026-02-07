import { createServerClient } from '@/lib/db/client'

export interface FrequentIngredient {
  id: string
  name: string
  recipeCount: number
}

/**
 * ユーザーの登録レシピに多く使われている食材を取得（RPC版）
 * @param userId 内部ユーザーID (UUID)
 * @param limit 取得件数（デフォルト10）
 */
export async function fetchFrequentIngredients(
  userId: string,
  limit: number = 10
): Promise<FrequentIngredient[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('get_frequent_ingredients', {
    p_user_id: userId,
    p_limit: limit,
  })

  if (error) {
    console.error('[fetchFrequentIngredients] RPC error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  return data.map((row: { id: string; name: string; recipe_count: number }) => ({
    id: row.id,
    name: row.name,
    recipeCount: row.recipe_count,
  }))
}

/**
 * LINE ユーザーIDから頻出食材を取得
 * @param lineUserId LINE ユーザーID
 * @param limit 取得件数
 */
export async function fetchFrequentIngredientsByLineUserId(
  lineUserId: string,
  limit: number = 10
): Promise<FrequentIngredient[]> {
  const supabase = createServerClient()

  // LINE ユーザーIDから内部ユーザーIDを取得
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single()

  if (userError || !user) {
    return []
  }

  return fetchFrequentIngredients(user.id, limit)
}
