import { createServerClient } from '@/lib/db/client'
import type { RecipeDetail, RecipeIngredient, IngredientRaw } from '@/types/recipe'

type RecipeIngredientRow = {
  recipe_id: string
  ingredient_id: string
  is_main: boolean
  ingredients: { id: string; name: string } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserIdByLineUserId(client: any, lineUserId: string): Promise<string | null> {
  const { data, error } = await client.from('users').select('id').eq('line_user_id', lineUserId).single()
  return error || !data ? null : data.id
}

/** 閲覧数をカウントアップ */
export async function recordRecipeView(recipeId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createServerClient() as any
  const { data: recipe } = await client
    .from('recipes')
    .select('view_count')
    .eq('id', recipeId)
    .single()

  if (recipe) {
    await client
      .from('recipes')
      .update({
        view_count: (recipe.view_count ?? 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', recipeId)
  }
}

/** レシピ詳細を取得 */
export async function fetchRecipeById(
  lineUserId: string,
  recipeId: string
): Promise<{ data: RecipeDetail | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createServerClient() as any

  try {
    const userId = await getUserIdByLineUserId(client, lineUserId)
    if (!userId) return { data: null, error: new Error('ユーザーが見つかりません') }

    const { data: recipe, error: recipeError } = await client
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', userId)
      .single()

    if (recipeError || !recipe) {
      return { data: null, error: null }
    }

    const { data: ingredientRows } = await client
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id, is_main, ingredients(id, name)')
      .eq('recipe_id', recipeId)
      .eq('is_main', true)

    const rows = (ingredientRows ?? []) as RecipeIngredientRow[]
    const mainIngredients: RecipeIngredient[] = rows
      .filter((ri) => ri.ingredients !== null)
      .map((ri) => ({
        id: ri.ingredients!.id,
        name: ri.ingredients!.name,
        isMain: ri.is_main,
      }))

    const ingredientsRaw: IngredientRaw[] = Array.isArray(recipe.ingredients_raw)
      ? (recipe.ingredients_raw as IngredientRaw[])
      : []

    return { data: { ...recipe, mainIngredients, ingredientsRaw }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/** レシピを削除 */
export async function deleteRecipe(
  lineUserId: string,
  recipeId: string
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createServerClient() as any

  try {
    const userId = await getUserIdByLineUserId(client, lineUserId)
    if (!userId) return { error: new Error('ユーザーが見つかりません') }

    const { error } = await client
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId)

    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/** レシピのメモを更新 */
export async function updateRecipeMemo(
  lineUserId: string,
  recipeId: string,
  memo: string
): Promise<{ error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createServerClient() as any

  try {
    const userId = await getUserIdByLineUserId(client, lineUserId)
    if (!userId) return { error: new Error('ユーザーが見つかりません') }

    const { error } = await client
      .from('recipes')
      .update({ memo, updated_at: new Date().toISOString() })
      .eq('id', recipeId)
      .eq('user_id', userId)

    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
