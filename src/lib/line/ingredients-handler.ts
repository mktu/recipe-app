import type { messagingApi } from '@line/bot-sdk'
import { createServerClient } from '@/lib/db/client'
import { recordRecipeView } from '@/lib/db/queries/recipes'
import type { IngredientRaw } from '@/types/recipe'
import { findUserId } from './search-recipes'
import { toRecipeCardUrl } from './track-redirect'
import { buildIngredientsMessages, RECIPE_NOT_FOUND_TEXT, type RecipeIngredientsForBot } from './ingredients-messages'
import { replyErrorText, replyText } from './reply'

type MessagingApiClient = messagingApi.MessagingApiClient

/** UUID として解釈できない値を uuid 列に渡したときのエラー。改ざんされた data で起きる */
const INVALID_TEXT_REPRESENTATION = '22P02'

/**
 * ingredients_raw を材料の配列にそろえる。形式は保証されていないので（`filter-recipes.ts`）、
 * 文字列の要素は name として扱い、null やオブジェクトでないものは捨てる
 */
function toIngredients(raw: unknown): IngredientRaw[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item): IngredientRaw[] => {
    if (typeof item === 'string') return [{ name: item, amount: '' }]
    if (!item || typeof item !== 'object') return []
    const { name, amount } = item as { name?: unknown; amount?: unknown }
    return [{ name: String(name ?? ''), amount: amount == null ? '' : String(amount) }]
  })
}

/**
 * 材料を返すレシピを取得する。
 *
 * recipeId は postback の data 由来で改ざんされうるので、**必ず user_id でも絞る**。
 * 他人のレシピ ID・存在しない ID・UUID でない文字列は、どれも null（見つからない）にする。
 * それ以外の DB エラーは投げる（「削除された」と案内して障害を隠さないため）。
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
  if (error?.code === INVALID_TEXT_REPRESENTATION) return null
  if (error) throw error
  if (!data) return null

  return {
    title: data.title,
    url: toRecipeCardUrl(data),
    ingredients: toIngredients(data.ingredients_raw),
  }
}

/**
 * [材料] で中身を確かめたことも閲覧として数える（#213）。
 * サイトを開かずに済ませるほど「よく見る」「最近見た」から漏れていくのを防ぐ。
 * 記録の失敗で返信を巻き込まないよう、返信のあとに行い、失敗は握ってログに残す
 */
async function recordViewSafely(recipeId: string): Promise<void> {
  try {
    await recordRecipeView(recipeId)
  } catch (error) {
    console.error('[handleIngredientsPostback] 閲覧の記録に失敗:', error)
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
    await recordViewSafely(recipeId)
  } catch (error) {
    console.error('[handleIngredientsPostback] Error:', error)
    await replyErrorText(client, replyToken, '材料の取得中にエラーが発生しました。')
  }
}
