import type { messagingApi } from '@line/bot-sdk'
import { createServerClient } from '@/lib/db/client'
import type { IngredientRaw } from '@/types/recipe'
import { findUserId } from './search-recipes'
import { toRecipeCardUrl } from './track-redirect'
import { buildIngredientsMessages, RECIPE_NOT_FOUND_TEXT, type RecipeIngredientsForBot } from './ingredients-messages'
import { replyErrorText, replyText } from './reply'

type MessagingApiClient = messagingApi.MessagingApiClient

/**
 * 材料を返すレシピを取得する。
 *
 * recipeId は postback の data 由来で改ざんされうるので、**必ず user_id でも絞る**。
 * 他人のレシピ ID・存在しない ID・UUID でない文字列は、どれも null（見つからない）にする。
 */
export async function fetchRecipeIngredientsForBot(
  lineUserId: string,
  recipeId: string
): Promise<RecipeIngredientsForBot | null> {
  const supabase = createServerClient()
  const userId = await findUserId(supabase, lineUserId)
  if (!userId) return null

  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, url, ingredients_raw')
    .eq('id', recipeId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null

  return {
    title: data.title,
    url: toRecipeCardUrl(data),
    ingredients: Array.isArray(data.ingredients_raw) ? (data.ingredients_raw as unknown as IngredientRaw[]) : [],
  }
}

/** 縦リストの [材料] ボタン（postback）に、材料をテキストで返す（#213） */
export async function handleIngredientsPostback(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string,
  recipeId: string
): Promise<void> {
  try {
    const recipe = await fetchRecipeIngredientsForBot(lineUserId, recipeId)
    if (!recipe) {
      await replyText(client, replyToken, RECIPE_NOT_FOUND_TEXT)
      return
    }
    await client.replyMessage({ replyToken, messages: buildIngredientsMessages(recipe) })
  } catch (error) {
    console.error('[handleIngredientsPostback] Error:', error)
    await replyErrorText(client, replyToken, '材料の取得中にエラーが発生しました。')
  }
}
