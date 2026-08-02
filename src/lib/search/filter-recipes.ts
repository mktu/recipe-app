/**
 * パース済みクエリでレシピを絞り込む
 *
 * 食材条件は正規化済みの食材IDで、テキスト条件は
 * タイトル・メモ・サイト名・材料テキストを対象に照合する。
 *
 * Edge Function にもコピーされるため相対 import のみ。
 */

import { normalizeSearchKey } from './normalize'
import type { ParsedSearchQuery } from './parse-query'

export interface SearchableRecipe {
  title: string
  memo?: string | null
  sourceName?: string | null
  /** DB の ingredients_raw（[{ name, amount }] 想定だが形式は保証しない） */
  ingredientsRaw?: unknown
  /** 紐付け済みの食材ID */
  ingredientIds: string[]
  /** 紐付け済みの食材名（正規化済みマスタ名） */
  ingredientNames?: string[]
}

/** ingredients_raw から材料名のテキストを取り出す */
function rawIngredientsToText(raw: unknown): string {
  if (!Array.isArray(raw)) return ''
  return raw
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'name' in item) {
        return String((item as { name: unknown }).name ?? '')
      }
      return ''
    })
    .join(' ')
}

/** テキスト照合用の文字列を組み立てる */
function buildHaystack(recipe: SearchableRecipe): string {
  return normalizeSearchKey(
    [
      recipe.title,
      recipe.memo ?? '',
      recipe.sourceName ?? '',
      (recipe.ingredientNames ?? []).join(' '),
      rawIngredientsToText(recipe.ingredientsRaw),
    ].join(' ')
  )
}

/** グループ内は OR、グループ間は AND */
function matchesIngredientGroups(recipe: SearchableRecipe, groups: string[][]): boolean {
  if (groups.length === 0) return true
  const owned = new Set(recipe.ingredientIds)
  return groups.every((group) => group.some((id) => owned.has(id)))
}

/** 語間は AND */
function matchesTextTerms(recipe: SearchableRecipe, normalizedTerms: string[]): boolean {
  if (normalizedTerms.length === 0) return true
  const haystack = buildHaystack(recipe)
  return normalizedTerms.every((term) => haystack.includes(term))
}

export function filterRecipesByQuery<T extends SearchableRecipe>(
  recipes: T[],
  query: ParsedSearchQuery
): T[] {
  if (query.ingredientGroups.length === 0 && query.textTerms.length === 0) return recipes

  const normalizedTerms = query.textTerms
    .map((term) => normalizeSearchKey(term))
    .filter((term) => term.length > 0)

  return recipes.filter(
    (recipe) =>
      matchesIngredientGroups(recipe, query.ingredientGroups) &&
      matchesTextTerms(recipe, normalizedTerms)
  )
}
