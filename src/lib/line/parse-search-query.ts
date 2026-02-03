import { createDefaultResolver, IngredientResolver } from './ingredient-resolver'

export interface ParsedSearchQuery {
  ingredientIds: string[]
  searchQuery: string
}

/**
 * 検索入力をパースして食材IDとテキスト検索クエリに分離
 *
 * @example
 * parseSearchQuery("鶏肉 玉ねぎ") → { ingredientIds: [...], searchQuery: "" }
 * parseSearchQuery("カレー") → { ingredientIds: [], searchQuery: "カレー" }
 * parseSearchQuery("豚肉 カレー") → { ingredientIds: [...], searchQuery: "カレー" }
 *
 * @param input ユーザー入力
 * @param resolver 食材解決に使うResolver（テスト時に差し替え可能）
 */
export async function parseSearchQuery(
  input: string,
  resolver: IngredientResolver = createDefaultResolver()
): Promise<ParsedSearchQuery> {
  // 全角/半角スペースで分割
  const words = input.split(/[\s　]+/).filter((w) => w.length > 0)

  if (words.length === 0) {
    return { ingredientIds: [], searchQuery: '' }
  }

  const ingredientIds: string[] = []
  const unmatchedWords: string[] = []

  for (const word of words) {
    const resolved = await resolver.resolve(word)
    if (resolved) {
      if (!ingredientIds.includes(resolved.id)) {
        ingredientIds.push(resolved.id)
      }
    } else {
      unmatchedWords.push(word)
    }
  }

  return {
    ingredientIds,
    searchQuery: unmatchedWords.join(' '),
  }
}
