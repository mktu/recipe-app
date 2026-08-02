/**
 * 検索語 1 語を食材IDの候補集合に解決する
 *
 * 解決順は「完全一致 → カテゴリ → 部分一致」。
 * 候補が複数になった語（「肉」「豚」など）は OR 条件として扱うため、
 * 1つに絞らず配列で返す。解決できない語は null（テキスト検索に回す）。
 *
 * Edge Function にもコピーされるため相対 import のみ。
 */

import type { IngredientIndex } from './ingredient-index'
import { normalizeSearchKey } from './normalize'

export type TermMatchKind = 'exact' | 'category' | 'contained' | 'including'

export interface TermMatch {
  ids: string[]
  kind: TermMatchKind
}

/** 候補が広がりすぎる語を防ぐ上限 */
const MAX_CANDIDATES = 30

/** 「マスタ名 ⊂ 入力」で採用する最小文字数（「肉」1文字でのマッチを防ぐ） */
const MIN_CONTAINED_LENGTH = 2

/**
 * カテゴリ名そのものでは引けない総称語の対応表
 * （キー・値ともに正規化済み。値は IngredientIndex.categoryMap のキー）
 */
const CATEGORY_ALIASES: Record<string, string> = {
  魚: '魚介',
  サカナ: '魚介',
  オサカナ: '魚介',
  シーフード: '魚介',
  ニク: '肉',
  オニク: '肉',
  ヤサイ: '野菜',
  メン: '麺類',
}

function resolveCategory(index: IngredientIndex, key: string): string[] | null {
  const direct = index.categoryMap.get(CATEGORY_ALIASES[key] ?? key)
  if (direct) return [...direct]

  // 「大豆」→「大豆製品」のような前方一致。1文字は広すぎるので対象外
  if (key.length >= 2) {
    for (const [categoryKey, ids] of index.categoryMap) {
      if (categoryKey.startsWith(key)) return [...ids]
    }
  }
  return null
}

/** マスタ名が入力に含まれる（「トマト缶」→ トマト）。最長のものを1件だけ採用 */
function resolveContained(index: IngredientIndex, key: string): string | null {
  for (let i = index.nameKeys.length - 1; i >= 0; i--) {
    const { id, key: nameKey } = index.nameKeys[i]
    if (nameKey.length < MIN_CONTAINED_LENGTH) break
    if (key.includes(nameKey)) return id
  }
  return null
}

/** 入力がマスタ名に含まれる（「豚バラ」→ 豚バラ肉）。候補は短い順に全件 */
function resolveIncluding(index: IngredientIndex, key: string): string[] {
  const ids: string[] = []
  for (const { id, key: nameKey } of index.nameKeys) {
    if (nameKey.includes(key)) ids.push(id)
    if (ids.length >= MAX_CANDIDATES) break
  }
  return ids
}

export function resolveTerm(index: IngredientIndex, word: string): TermMatch | null {
  const key = normalizeSearchKey(word)
  if (!key) return null

  const exactId = index.exactMap.get(key)
  if (exactId) return { ids: [exactId], kind: 'exact' }

  const categoryIds = resolveCategory(index, key)
  if (categoryIds) return { ids: categoryIds, kind: 'category' }

  const containedId = resolveContained(index, key)
  if (containedId) return { ids: [containedId], kind: 'contained' }

  const includingIds = resolveIncluding(index, key)
  if (includingIds.length > 0) return { ids: includingIds, kind: 'including' }

  return null
}
