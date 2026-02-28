import { messagingApi } from '@line/bot-sdk'
import { createVerticalListMessage, RecipeCardData } from './flex-message'
import { fetchMostViewedForBot, fetchFewIngredientsForBot, fetchShortCookingTimeForBot, SearchRecipeResult } from './search-recipes'

type MessagingApiClient = messagingApi.MessagingApiClient

const toCard = (r: SearchRecipeResult): RecipeCardData => ({
  title: r.title,
  url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/track/recipe/${r.id}`,
  imageUrl: r.imageUrl,
  sourceName: r.sourceName,
})

/** 「探す」キーワードかどうかを判定 */
export function isSearchKeyword(text: string): boolean {
  return ['探す', 'さがす', 'search'].includes(text.trim())
}

/** 「よく見る」キーワードかどうかを判定 */
export function isYokuTsukuruKeyword(text: string): boolean {
  return ['よく見る', 'よくみる', 'よく見るレシピ', 'よく作る', 'よくつくる'].includes(text.trim())
}

/** 「時短」キーワードかどうかを判定 */
export function isShortCookingTimeKeyword(text: string): boolean {
  return ['時短', '時短レシピ', 'じたん'].includes(text.trim())
}

/** 「材料少なめ」キーワードかどうかを判定 */
export function isFewIngredientsKeyword(text: string): boolean {
  return ['材料少なめ', '材料少ない', '少ない材料'].includes(text.trim())
}

/** 「お気に入り」キーワードかどうかを判定 */
export function isOkiniiriKeyword(text: string): boolean {
  return ['お気に入り', 'おきにいり', 'お気に入りレシピ'].includes(text.trim())
}

/** 「探す」に対して検索案内 + Quick Reply を返す */
export async function handleSearchCategoryPrompt(
  client: MessagingApiClient,
  replyToken: string
): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [
      {
        type: 'text',
        text: '🔍 レシピを探す\n\n食材名やレシピ名をそのまま入力して検索できます。\n例：「鶏肉 玉ねぎ」「パスタ」\n\nよく使う絞り込み👇',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '🔁 よく見る', text: 'よく見る' } },
            { type: 'action', action: { type: 'message', label: '📦 材料少なめ', text: '材料少なめ' } },
            { type: 'action', action: { type: 'message', label: '⏱ 時短', text: '時短' } },
          ],
        },
      },
    ],
  })
}

async function replyText(client: MessagingApiClient, replyToken: string, text: string): Promise<void> {
  await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] })
}

async function replyWithRecipes(
  client: MessagingApiClient,
  replyToken: string,
  recipes: SearchRecipeResult[],
  headerText: string
): Promise<void> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
  await client.replyMessage({
    replyToken,
    messages: [createVerticalListMessage(recipes.map(toCard), `https://liff.line.me/${liffId}`, recipes.length, headerText)],
  })
}

/** よく作るレシピを返す（view_count 上位） */
export async function handleYokuTsukuru(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string
): Promise<void> {
  try {
    const recipes = await fetchMostViewedForBot(lineUserId)
    if (recipes.length === 0) {
      await replyText(client, replyToken, 'まだ閲覧履歴がありません。レシピを見てみましょう！')
      return
    }
    await replyWithRecipes(client, replyToken, recipes, '🔁 よく見るレシピ')
  } catch (err) {
    console.error('[LINE Webhook] handleYokuTsukuru error:', err)
    await replyText(client, replyToken, 'レシピの取得中にエラーが発生しました。')
  }
}

/** 時短レシピを返す */
export async function handleShortCookingTime(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string
): Promise<void> {
  try {
    const recipes = await fetchShortCookingTimeForBot(lineUserId)
    if (recipes.length === 0) {
      await replyText(client, replyToken, '調理時間が登録されたレシピがまだありません。\nレシピ登録時に自動で取得されます。')
      return
    }
    await replyWithRecipes(client, replyToken, recipes, '⏱ 時短レシピ')
  } catch (err) {
    console.error('[LINE Webhook] handleShortCookingTime error:', err)
    await replyText(client, replyToken, 'レシピの取得中にエラーが発生しました。')
  }
}

/** 材料少なめレシピを返す */
export async function handleFewIngredients(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string
): Promise<void> {
  try {
    const recipes = await fetchFewIngredientsForBot(lineUserId)
    if (recipes.length === 0) {
      await replyText(client, replyToken, 'レシピがまだ登録されていません。\nURLを送ってレシピを保存しましょう！')
      return
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const cards: RecipeCardData[] = recipes.map((r) => ({
      title: r.title,
      url: `${baseUrl}/api/track/recipe/${r.id}`,
      imageUrl: r.imageUrl,
      sourceName: r.sourceName,
      ingredientCount: r.ingredientCount,
    }))
    const counts = recipes.flatMap((r) => (r.ingredientCount != null ? [r.ingredientCount] : []))
    const maxCount = counts.length > 0 ? Math.max(...counts) : null
    const headerText = maxCount != null ? `📦 材料${maxCount}品以下のレシピに絞りました！` : '📦 材料少なめレシピ'
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
    await client.replyMessage({
      replyToken,
      messages: [createVerticalListMessage(cards, `https://liff.line.me/${liffId}`, cards.length, headerText)],
    })
  } catch (err) {
    console.error('[LINE Webhook] handleFewIngredients error:', err)
    await replyText(client, replyToken, 'レシピの取得中にエラーが発生しました。')
  }
}

/** お気に入りレシピ（近日公開予定） */
export async function handleFavorites(
  client: MessagingApiClient,
  replyToken: string
): Promise<void> {
  await replyText(client, replyToken, '⭐ お気に入り機能は近日公開予定です！\nお楽しみに😊')
}
