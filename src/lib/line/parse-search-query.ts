import { createServerClient } from '@/lib/db/client'
import { fetchIngredientIndex } from '@/lib/db/queries/ingredient-index'
import type { IngredientIndex } from '@/lib/search/ingredient-index'
import { parseSearchQuery as parseWithIndex, type ParsedSearchQuery } from '@/lib/search/parse-query'

export type { ParsedSearchQuery }
export { isEmptyQuery } from '@/lib/search/parse-query'

/**
 * Bot の検索入力をパースして食材条件とテキスト条件に分離する
 *
 * 解決ロジックの本体は `@/lib/search`（Web と共有）。ここは DB 取得の薄いラッパー。
 *
 * @example
 * parseSearchQuery("豚肉 玉ねぎ") → { ingredientGroups: [{ ids: [豚肉+子食材], text: "豚肉" }, { ids: [たまねぎ], text: "玉ねぎ" }], textTerms: [] }
 * parseSearchQuery("カレー")     → { ingredientGroups: [], textTerms: ["カレー"] }
 * parseSearchQuery("肉 簡単")    → { ingredientGroups: [{ ids: [肉カテゴリ全件], text: null }], textTerms: ["簡単"] }
 *
 * @param input ユーザー入力
 * @param index 食材索引（テスト時に差し替え可能）
 */
export async function parseSearchQuery(
  input: string,
  index?: IngredientIndex
): Promise<ParsedSearchQuery> {
  const resolved = index ?? (await fetchIngredientIndex(createServerClient()))
  return parseWithIndex(resolved, input)
}
