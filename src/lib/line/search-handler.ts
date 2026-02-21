import { messagingApi } from '@line/bot-sdk'
import { createVerticalListMessage, RecipeCardData } from './flex-message'
import { parseSearchQuery, ParsedSearchQuery } from './parse-search-query'
import { searchRecipesForBot, SearchRecipeResult } from './search-recipes'
import { buildIngredientQuickReply } from './quick-reply'

type MessagingApiClient = messagingApi.MessagingApiClient
type ReplyParams = { client: MessagingApiClient; replyToken: string }

/** 食材検索キーワードかどうかを判定 */
const INGREDIENT_SEARCH_KEYWORDS = ['食材', '食材で探す', '食材検索']

export function isIngredientSearchKeyword(text: string): boolean {
  const normalizedText = text.trim()
  return INGREDIENT_SEARCH_KEYWORDS.includes(normalizedText)
}

function toLiffDetailUrl(id: string): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
  return `https://liff.line.me/${liffId}/recipes/${id}`
}

const toCard = (r: SearchRecipeResult): RecipeCardData => ({
  title: r.title,
  url: toLiffDetailUrl(r.id),
  imageUrl: r.imageUrl,
  sourceName: r.sourceName,
})

/** LIFF URLに検索クエリパラメータを付与 */
function buildLiffUrl(query: ParsedSearchQuery): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
  const baseUrl = `https://liff.line.me/${liffId}`
  const params = new URLSearchParams()

  if (query.searchQuery.trim()) {
    params.set('q', query.searchQuery.trim())
  }
  if (query.ingredientIds.length > 0) {
    params.set('ingredients', query.ingredientIds.join(','))
  }

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

async function replyText(params: ReplyParams, text: string): Promise<void> {
  await params.client.replyMessage({ replyToken: params.replyToken, messages: [{ type: 'text', text }] })
}

async function replyWithRecipes(
  params: ReplyParams,
  recipes: SearchRecipeResult[],
  query: ParsedSearchQuery
): Promise<void> {
  const top5 = recipes.slice(0, 5)
  const listUrl = buildLiffUrl(query)
  await params.client.replyMessage({
    replyToken: params.replyToken,
    messages: [createVerticalListMessage(top5.map(toCard), listUrl, recipes.length)],
  })
}

/** 検索を実行して結果を返す */
export async function handleSearch(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string,
  text: string,
  ensureUser: (lineUserId: string) => Promise<void>
): Promise<void> {
  const params: ReplyParams = { client, replyToken }
  try {
    await ensureUser(lineUserId)
    const query = await parseSearchQuery(text)

    if (query.ingredientIds.length === 0 && !query.searchQuery.trim()) {
      await replyText(params, 'レシピURLを送ってください 🍳\n\n食材名やキーワードで検索もできます。')
      return
    }

    const recipes = await searchRecipesForBot(lineUserId, query, 10)

    if (recipes.length === 0) {
      await replyText(params, '該当するレシピが見つかりませんでした 🔍')
      return
    }

    await replyWithRecipes(params, recipes, query)
  } catch (err) {
    console.error('[LINE Webhook] Search error:', err)
    await replyText(params, '検索中にエラーが発生しました。')
  }
}

/** 食材検索の案内メッセージ + クイックリプライを返す */
export async function handleIngredientSearchPrompt(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string
): Promise<void> {
  try {
    const quickReplyItems = await buildIngredientQuickReply(lineUserId)

    const guideMessage = `🔍 食材で検索

下の食材をタップするか、食材名を入力してください。

例: 鶏肉 玉ねぎ`

    await client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: guideMessage,
          quickReply: quickReplyItems.length > 0 ? { items: quickReplyItems } : undefined,
        },
      ],
    })
  } catch (err) {
    console.error('[LINE Webhook] Ingredient search prompt error:', err)
    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: '食材検索の準備中にエラーが発生しました。' }],
    })
  }
}
