import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/db/client'
import type { Database, Json, TablesInsert } from '@/types/database'
import type { CreateRecipeInput } from '@/types/recipe'

type TypedSupabaseClient = SupabaseClient<Database>

export interface CreateRecipeResult {
  id: string
}

export interface CreateRecipeError {
  message: string
  code?: string
}

async function getUserIdByLineUserId(client: TypedSupabaseClient, lineUserId: string): Promise<string | null> {
  const { data, error } = await client.from('users').select('id').eq('line_user_id', lineUserId).single()
  return error || !data ? null : (data as { id: string }).id
}

async function insertRecipe(client: TypedSupabaseClient, userId: string, input: CreateRecipeInput): Promise<{ id: string } | null> {
  const recipeData: TablesInsert<'recipes'> = {
    user_id: userId,
    url: input.url,
    title: input.title,
    source_name: input.sourceName || null,
    image_url: input.imageUrl || null,
    memo: input.memo || null,
    ingredients_raw: (input.ingredientsRaw ?? []) as unknown as Json,
    ingredients_linked: input.ingredientIds.length > 0,
    cooking_time_minutes: input.cookingTimeMinutes ?? null,
  }
  const { data, error } = await client.from('recipes').insert(recipeData).select('id').single()
  if (error) throw error
  return data
}

async function insertRecipeIngredients(client: TypedSupabaseClient, recipeId: string, ingredientIds: string[]): Promise<void> {
  if (ingredientIds.length === 0) return
  const rows: TablesInsert<'recipe_ingredients'>[] = ingredientIds.map((id) => ({
    recipe_id: recipeId,
    ingredient_id: id,
    is_main: true,
  }))
  const { error } = await client.from('recipe_ingredients').insert(rows)
  if (error) console.error('[createRecipe] recipe_ingredients insert error:', error)
}

/** レシピを新規作成 */
export async function createRecipe(input: CreateRecipeInput): Promise<{ data: CreateRecipeResult | null; error: CreateRecipeError | null }> {
  const client = createServerClient()

  try {
    const userId = await getUserIdByLineUserId(client, input.lineUserId)
    if (!userId) return { data: null, error: { message: 'ユーザーが見つかりません' } }

    const recipe = await insertRecipe(client, userId, input)
    if (!recipe) return { data: null, error: { message: 'レシピの作成に失敗しました' } }

    await insertRecipeIngredients(client, recipe.id, input.ingredientIds)

    return { data: { id: recipe.id }, error: null }
  } catch (err: unknown) {
    console.error('[createRecipe] Error:', err)
    if (err && typeof err === 'object' && 'code' in err) {
      const pgError = err as { code: string; message?: string }
      return { data: null, error: { message: pgError.message || 'Database error', code: pgError.code } }
    }
    return { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } }
  }
}

// 検索・一覧取得は recipe-search.ts から re-export
export { fetchRecipes } from './recipe-search'
export type { FetchRecipesParams } from './recipe-search'
// 詳細関連は recipe-detail.ts から re-export
export { fetchRecipeById, deleteRecipe, updateRecipeMemo, recordRecipeView } from './recipe-detail'
