import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/db/client'
import { getUserIdByLineUserId } from '@/lib/db/queries/users'
import type { Database, Json, TablesInsert, TablesUpdate } from '@/types/database'
import type { RecipeDetail, RecipeIngredient, IngredientRaw, UpdateRecipeInput } from '@/types/recipe'

type TypedSupabaseClient = SupabaseClient<Database>

type RecipeIngredientRow = {
  recipe_id: string
  ingredient_id: string
  is_main: boolean
  ingredients: { id: string; name: string } | null
}

/** 閲覧数をカウントアップ */
export async function recordRecipeView(recipeId: string): Promise<void> {
  const client = createServerClient()
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
  const client = createServerClient()

  try {
    const userId = await getUserIdByLineUserId(client, lineUserId)
    if (!userId) return { data: null, error: new Error('ユーザーが見つかりません') }

    // recipe_notes.recipe_id は UNIQUE なので、埋め込みは配列ではなく1件か null で返る
    const { data: row, error: recipeError } = await client
      .from('recipes')
      .select('*, recipe_notes(id)')
      .eq('id', recipeId)
      .eq('user_id', userId)
      .single()

    if (recipeError || !row) {
      return { data: null, error: null }
    }
    const { recipe_notes: note, ...recipe } = row

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
      ? (recipe.ingredients_raw as unknown as IngredientRaw[])
      : []

    return { data: { ...recipe, mainIngredients, ingredientsRaw, noteId: note?.id ?? null }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/** レシピを削除 */
export async function deleteRecipe(
  lineUserId: string,
  recipeId: string
): Promise<{ error: Error | null }> {
  const client = createServerClient()

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

async function replaceRecipeIngredients(client: TypedSupabaseClient, recipeId: string, ingredientIds: string[]): Promise<void> {
  await client.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
  if (ingredientIds.length === 0) return
  const rows: TablesInsert<'recipe_ingredients'>[] = ingredientIds.map((id) => ({
    recipe_id: recipeId,
    ingredient_id: id,
    is_main: true,
  }))
  const { error } = await client.from('recipe_ingredients').insert(rows)
  if (error) throw error
}

/** UpdateRecipeInput を recipes テーブルの更新用カラムにマッピング */
function buildRecipeUpdate(updates: UpdateRecipeInput): TablesInsert<'recipes'> & { updated_at: string } {
  const recipeUpdate: TablesInsert<'recipes'> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  } as TablesInsert<'recipes'> & { updated_at: string }
  if (typeof updates.memo === 'string') recipeUpdate.memo = updates.memo
  if (updates.ingredientsRaw) recipeUpdate.ingredients_raw = updates.ingredientsRaw as unknown as Json
  if (updates.ingredientIds) recipeUpdate.ingredients_linked = updates.ingredientIds.length > 0
  if (typeof updates.title === 'string') recipeUpdate.title = updates.title
  if (typeof updates.sourceName === 'string') recipeUpdate.source_name = updates.sourceName || null
  if (typeof updates.imageUrl === 'string') recipeUpdate.image_url = updates.imageUrl || null
  if (updates.cookingTimeMinutes !== undefined) recipeUpdate.cooking_time_minutes = updates.cookingTimeMinutes
  return recipeUpdate
}

/**
 * タイトルが変わるなら埋め込みを無効化する列を返す。
 *
 * generate-embeddings は `title_embedding IS NULL` かつリトライ上限未満の行しか拾わないため、
 * 落とさないと古いタイトルの埋め込みが残り続ける。リトライ回数も戻すのは、過去に失敗を
 * 重ねた行が再生成の対象から外れたままになるのを防ぐため（`update_recipe_note` と同じ扱い）。
 * 再取得ダイアログは変更が無くても title を送るので、値を比べてから落とす。
 */
async function buildEmbeddingReset(
  client: TypedSupabaseClient,
  recipeId: string,
  userId: string,
  newTitle: string | undefined
): Promise<TablesUpdate<'recipes'>> {
  if (typeof newTitle !== 'string') return {}
  const { data } = await client
    .from('recipes')
    .select('title')
    .eq('id', recipeId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data || data.title === newTitle) return {}
  return { title_embedding: null, embedding_generated_at: null, embedding_retry_count: 0 }
}

/** レシピを更新（食材・メモ・メタ情報等） */
export async function updateRecipe(
  lineUserId: string,
  recipeId: string,
  updates: UpdateRecipeInput
): Promise<{ error: Error | null }> {
  const client = createServerClient()

  try {
    const userId = await getUserIdByLineUserId(client, lineUserId)
    if (!userId) return { error: new Error('ユーザーが見つかりません') }

    const recipeUpdate = {
      ...buildRecipeUpdate(updates),
      ...(await buildEmbeddingReset(client, recipeId, userId, updates.title)),
    }

    const { error: updateError } = await client
      .from('recipes')
      .update(recipeUpdate)
      .eq('id', recipeId)
      .eq('user_id', userId)
    if (updateError) throw updateError

    if (updates.ingredientIds) {
      await replaceRecipeIngredients(client, recipeId, updates.ingredientIds)
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
