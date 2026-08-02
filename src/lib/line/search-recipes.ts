import { createServerClient } from '@/lib/db/client'
import { getVectorSearchIds } from '@/lib/db/queries/recipe-embedding'
import { filterRecipesByQuery } from '@/lib/search/filter-recipes'
import type { ParsedSearchQuery } from '@/lib/search/parse-query'
import { fetchSearchableRecipes, type BotSearchableRecipe } from './searchable-recipes'

/** テキスト検索がこの件数に満たない場合はベクトル検索で補完する */
const MIN_TEXT_RESULTS = 3

export interface SearchRecipeResult {
  id: string
  title: string
  url: string
  imageUrl: string | null
  sourceName: string | null
  ingredientCount?: number | null
  cookingTimeMinutes?: number | null
}

export const toResult = (r: BotSearchableRecipe): SearchRecipeResult => ({
  id: r.id,
  title: r.title,
  url: r.url,
  imageUrl: r.imageUrl,
  sourceName: r.sourceName ?? null,
  cookingTimeMinutes: r.cookingTimeMinutes,
  ingredientCount: r.ingredientCount,
})

export async function findUserId(
  client: ReturnType<typeof createServerClient>,
  lineUserId: string
): Promise<string | null> {
  const { data } = await client.from('users').select('id').eq('line_user_id', lineUserId).single()
  return data?.id ?? null
}

/**
 * ベクトル検索でテキスト条件を補完する
 *
 * 食材条件（AND）は満たしたままにしたいので、候補は食材条件を通ったものに限定する。
 */
async function findByVectorSearch(
  client: ReturnType<typeof createServerClient>,
  userId: string,
  query: ParsedSearchQuery,
  allRecipes: BotSearchableRecipe[],
  matched: BotSearchableRecipe[],
  limit: number
): Promise<BotSearchableRecipe[]> {
  try {
    const excludeIds = matched.map((r) => r.id)
    const ids = await getVectorSearchIds(client, userId, query.textTerms.join(' '), excludeIds, limit)
    if (ids.length === 0) return []

    const eligible = filterRecipesByQuery(allRecipes, {
      ingredientGroups: query.ingredientGroups,
      textTerms: [],
    })
    const byId = new Map(eligible.map((r) => [r.id, r]))
    return ids.map((id) => byId.get(id)).filter((r): r is BotSearchableRecipe => r !== undefined)
  } catch (e) {
    console.error('[findByVectorSearch] Vector search failed:', e)
    return []
  }
}

/**
 * Bot 検索: 食材条件（グループ内OR / グループ間AND）+ テキスト条件（AND）で絞り込む
 *
 * レシピを新しい順に全件取得し、Web の get-recipes と同じ照合ロジックで絞り込む。
 */
export async function searchRecipesForBot(
  lineUserId: string,
  query: ParsedSearchQuery,
  limit: number = 10
): Promise<SearchRecipeResult[]> {
  const supabase = createServerClient()
  const userId = await findUserId(supabase, lineUserId)
  if (!userId) return []

  const recipes = await fetchSearchableRecipes(supabase, userId)
  if (recipes.length === 0) return []

  const matched = filterRecipesByQuery(recipes, query)

  if (query.textTerms.length > 0 && matched.length < MIN_TEXT_RESULTS) {
    const extra = await findByVectorSearch(supabase, userId, query, recipes, matched, limit)
    return [...matched, ...extra].slice(0, limit).map(toResult)
  }

  return matched.slice(0, limit).map(toResult)
}
