import { supabase } from '@/lib/db/client'
import type { IngredientsByCategory } from '@/types/recipe'
import type { Tables } from '@/types/database'

/**
 * カテゴリ別に食材一覧を取得
 */
export async function fetchIngredientsByCategory(): Promise<{
  data: IngredientsByCategory[]
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('needs_review', false)
      .order('name')

    if (error) throw error

    const ingredients = (data ?? []) as Tables<'ingredients'>[]

    // カテゴリ別にグループ化
    const categoryMap = new Map<string, Tables<'ingredients'>[]>()
    const categoryOrder = ['野菜', '肉', '魚介', 'きのこ', '卵・乳製品', '豆腐・大豆製品', '穀物・麺類', 'その他']

    for (const ingredient of ingredients) {
      const list = categoryMap.get(ingredient.category) || []
      list.push(ingredient)
      categoryMap.set(ingredient.category, list)
    }

    // カテゴリ順にソート
    const result: IngredientsByCategory[] = categoryOrder
      .filter((cat) => categoryMap.has(cat))
      .map((category) => ({
        category,
        ingredients: categoryMap.get(category) || [],
      }))

    // 定義外のカテゴリを末尾に追加
    for (const [category, ingredients] of categoryMap) {
      if (!categoryOrder.includes(category)) {
        result.push({ category, ingredients })
      }
    }

    return { data: result, error: null }
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
