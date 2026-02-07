import { createServerClient } from '@/lib/db/client'

/**
 * レシピ未登録の新規ユーザー向けデフォルト食材リスト
 * seed/ingredients.json の name と一致する必要あり
 */
const DEFAULT_INGREDIENT_NAMES = [
  '鶏肉',
  '豚肉',
  'たまご',
  'キャベツ',
  'たまねぎ',
  'じゃがいも',
  'にんじん',
  '豆腐',
  '鮭',
  'もやし',
]

export interface DefaultIngredient {
  id: string
  name: string
}

// メモリキャッシュ（サーバー起動中は保持）
let cachedDefaultIngredients: DefaultIngredient[] | null = null

/**
 * デフォルト食材をDBから取得（キャッシュあり）
 */
export async function getDefaultIngredients(): Promise<DefaultIngredient[]> {
  if (cachedDefaultIngredients) {
    return cachedDefaultIngredients
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name')
    .in('name', DEFAULT_INGREDIENT_NAMES)

  if (error) {
    console.error('[getDefaultIngredients] Error:', error)
    return []
  }

  // 定義順にソート
  const sortedData = (data ?? []).sort((a, b) => {
    const indexA = DEFAULT_INGREDIENT_NAMES.indexOf(a.name)
    const indexB = DEFAULT_INGREDIENT_NAMES.indexOf(b.name)
    return indexA - indexB
  })

  cachedDefaultIngredients = sortedData.map((item) => ({
    id: item.id,
    name: item.name,
  }))

  return cachedDefaultIngredients
}
