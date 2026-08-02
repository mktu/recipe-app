/**
 * 食材の検索フィルタ
 * 手動紐付け・レシピ絞り込みの両方で使う、食材名の部分一致検索ロジック
 */

import { toKatakana } from '@/lib/search/normalize'

/** ひらがな → カタカナ に正規化（実装は検索モジュールと共有） */
export { toKatakana }

interface SearchableIngredient {
  id: string
  name: string
}

/**
 * 検索クエリで食材を部分一致フィルタする
 * ひらがな/カタカナ・大文字小文字の違いを吸収する
 *
 * @param ingredients 検索対象の食材配列
 * @param query 検索文字列（空・空白のみの場合は空配列を返す）
 * @param excludeIds 結果から除外する食材ID（選択済みなど）
 */
export function filterIngredientsByQuery<T extends SearchableIngredient>(
  ingredients: T[],
  query: string,
  excludeIds: Set<string> = new Set()
): T[] {
  if (!query.trim()) return []
  const normalized = toKatakana(query.toLowerCase())
  return ingredients.filter(
    (ing) => toKatakana(ing.name.toLowerCase()).includes(normalized) && !excludeIds.has(ing.id)
  )
}
