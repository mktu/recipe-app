/**
 * 検索入力を「食材条件」と「テキスト条件」に分解する
 *
 * Edge Function にもコピーされるため相対 import のみ。
 */

import type { IngredientIndex } from './ingredient-index'
import { expandWithChildren } from './ingredient-index'
import { normalizeSearchKey, splitSearchWords } from './normalize'
import { resolveTerm } from './resolve-term'

export interface ParsedSearchQuery {
  /** グループ内は OR（子食材まで展開済み）、グループ間は AND */
  ingredientGroups: string[][]
  /** 食材に解決できなかった語。語間は AND */
  textTerms: string[]
}

export const EMPTY_QUERY: ParsedSearchQuery = { ingredientGroups: [], textTerms: [] }

export function isEmptyQuery(query: ParsedSearchQuery): boolean {
  return query.ingredientGroups.length === 0 && query.textTerms.length === 0
}

/**
 * 検索入力をパースする
 *
 * @example
 * parseSearchQuery(index, '豚肉 玉ねぎ')
 * // → { ingredientGroups: [[豚肉+子食材], [たまねぎ]], textTerms: [] }
 * parseSearchQuery(index, '肉 簡単')
 * // → { ingredientGroups: [[肉カテゴリ全件]], textTerms: ['簡単'] }
 */
export function parseSearchQuery(index: IngredientIndex, input: string): ParsedSearchQuery {
  const ingredientGroups: string[][] = []
  const textTerms: string[] = []
  const seenWords = new Set<string>()
  // 「玉ねぎ」と「たまねぎ」のように表記違いで同じ食材に解決した語をまとめる
  const seenGroups = new Set<string>()

  for (const word of splitSearchWords(input)) {
    const key = normalizeSearchKey(word)
    if (!key || seenWords.has(key)) continue
    seenWords.add(key)

    const match = resolveTerm(index, word)
    if (!match) {
      textTerms.push(word)
      continue
    }

    const group = expandWithChildren(index, match.ids)
    const signature = [...group].sort().join(',')
    if (seenGroups.has(signature)) continue
    seenGroups.add(signature)
    ingredientGroups.push(group)
  }

  return { ingredientGroups, textTerms }
}
