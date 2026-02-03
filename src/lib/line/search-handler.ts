import { messagingApi } from '@line/bot-sdk'
import { createRecipeMessage, RecipeCardData } from './flex-message'
import { parseSearchQuery } from './parse-search-query'
import { searchRecipesForBot, SearchRecipeResult } from './search-recipes'

type MessagingApiClient = messagingApi.MessagingApiClient
type ReplyParams = { client: MessagingApiClient; replyToken: string }

const toCard = (r: SearchRecipeResult): RecipeCardData => ({
  title: r.title, url: r.url, imageUrl: r.imageUrl, sourceName: r.sourceName,
})

async function replyText(params: ReplyParams, text: string): Promise<void> {
  await params.client.replyMessage({ replyToken: params.replyToken, messages: [{ type: 'text', text }] })
}

async function replyWithRecipes(params: ReplyParams, recipes: SearchRecipeResult[]): Promise<void> {
  if (recipes.length >= 4) {
    const text = `${recipes.length}件のレシピが見つかりました！\nメニューの「レシピ一覧」からすべて確認できます。`
    await params.client.replyMessage({
      replyToken: params.replyToken,
      messages: [{ type: 'text', text }, createRecipeMessage(recipes.slice(0, 3).map(toCard))],
    })
  } else {
    await params.client.replyMessage({
      replyToken: params.replyToken,
      messages: [createRecipeMessage(recipes.map(toCard))],
    })
  }
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

    await replyWithRecipes(params, recipes)
  } catch (err) {
    console.error('[LINE Webhook] Search error:', err)
    await replyText(params, '検索中にエラーが発生しました。')
  }
}
