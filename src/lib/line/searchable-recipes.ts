import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { SearchableRecipe } from '@/lib/search/filter-recipes'

type TypedSupabaseClient = SupabaseClient<Database>

/** 検索対象として取得したレシピ（表示用の列 + 照合用の食材情報） */
export interface BotSearchableRecipe extends SearchableRecipe {
  id: string
  url: string
  imageUrl: string | null
  cookingTimeMinutes: number | null
  ingredientCount: number | null
}

const RECIPE_COLUMNS = 'id, title, url, image_url, source_name, memo, cooking_time_minutes, ingredients_raw'

interface IngredientLink {
  recipe_id: string
  ingredient_id: string
  ingredients: { name: string } | { name: string }[] | null
}

function toIngredientName(link: IngredientLink): string {
  const { ingredients } = link
  if (!ingredients) return ''
  return Array.isArray(ingredients) ? (ingredients[0]?.name ?? '') : ingredients.name
}

/** レシピIDごとの食材ID・食材名を集計 */
async function fetchIngredientLinks(
  client: TypedSupabaseClient,
  recipeIds: string[]
): Promise<Map<string, { ids: string[]; names: string[] }>> {
  const map = new Map<string, { ids: string[]; names: string[] }>()
  if (recipeIds.length === 0) return map

  const { data } = await client
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, ingredients(name)')
    .in('recipe_id', recipeIds)

  for (const link of (data ?? []) as IngredientLink[]) {
    const entry = map.get(link.recipe_id) ?? { ids: [], names: [] }
    entry.ids.push(link.ingredient_id)
    const name = toIngredientName(link)
    if (name) entry.names.push(name)
    map.set(link.recipe_id, entry)
  }
  return map
}

/**
 * ユーザーのレシピを検索可能な形で全件取得する（新しい順）
 *
 * 絞り込みは JS 側（`filterRecipesByQuery`）で行う。Web の get-recipes と
 * 同じ関数で照合するため、材料テキストや食材名も含めて取得する。
 */
export async function fetchSearchableRecipes(
  client: TypedSupabaseClient,
  userId: string
): Promise<BotSearchableRecipe[]> {
  const { data: recipes } = await client
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!recipes || recipes.length === 0) return []

  const links = await fetchIngredientLinks(
    client,
    recipes.map((r) => r.id)
  )

  return recipes.map((r) => {
    const link = links.get(r.id)
    return {
      id: r.id,
      title: r.title,
      url: r.url,
      imageUrl: r.image_url,
      sourceName: r.source_name,
      memo: r.memo,
      cookingTimeMinutes: r.cooking_time_minutes,
      ingredientsRaw: r.ingredients_raw,
      ingredientCount: Array.isArray(r.ingredients_raw) ? r.ingredients_raw.length : null,
      ingredientIds: link?.ids ?? [],
      ingredientNames: link?.names ?? [],
    }
  })
}
