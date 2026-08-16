/**
 * 検索入力を「食材条件」と「テキスト条件」に分解する
 *
 * Edge Function にもコピーされるため相対 import のみ。
 */

import type { IngredientIndex } from './ingredient-index'
import { expandWithChildren } from './ingredient-index'
import { normalizeSearchKey, splitSearchWords } from './normalize'
import { resolveTerm, type TermMatchKind } from './resolve-term'

export interface IngredientCondition {
  /** グループ内は OR（子食材まで展開済み） */
  ids: string[]
  /**
   * 食材ID一致の代わりにテキスト照合してもよい元の入力語。
   * ID 一致とは OR で結合する（「トマト」でタイトルだけ一致するレシピも拾うため）。
   * カテゴリ語（「肉」「魚」等）は照合が広すぎるので null。
   */
  text: string | null
}

export interface ParsedSearchQuery {
  /** グループ内は OR、グループ間は AND */
  ingredientGroups: IngredientCondition[]
  /** 食材に解決できなかった語。語間は AND */
  textTerms: string[]
}

export const EMPTY_QUERY: ParsedSearchQuery = { ingredientGroups: [], textTerms: [] }

export function isEmptyQuery(query: ParsedSearchQuery): boolean {
  return query.ingredientGroups.length === 0 && query.textTerms.length === 0
}

/**
 * カテゴリ語（「肉」「魚」等）はテキスト照合に回さない
 *
 * カテゴリはID一致だけで既に広くカバーできる一方、元の入力語での
 * テキスト一致は「肉なし〜」「魚焼きグリル〜」まで拾ってしまう。
 */
function textForMatch(kind: TermMatchKind, word: string): string | null {
  return kind === 'category' ? null : word
}

/**
 * 検索入力をパースする
 *
 * @example
 * parseSearchQuery(index, '豚肉 玉ねぎ')
 * // → { ingredientGroups: [{ ids: [豚肉+子食材], text: '豚肉' }, { ids: [たまねぎ], text: '玉ねぎ' }], textTerms: [] }
 * parseSearchQuery(index, '肉 簡単')
 * // → { ingredientGroups: [{ ids: [肉カテゴリ全件], text: null }], textTerms: ['簡単'] }
 */
export function parseSearchQuery(index: IngredientIndex, input: string): ParsedSearchQuery {
  const ingredientGroups: IngredientCondition[] = []
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

    const ids = expandWithChildren(index, match.ids)
    const signature = [...ids].sort().join(',')
    if (seenGroups.has(signature)) continue
    seenGroups.add(signature)
    ingredientGroups.push({ ids, text: textForMatch(match.kind, word) })
  }

  return { ingredientGroups, textTerms }
}
