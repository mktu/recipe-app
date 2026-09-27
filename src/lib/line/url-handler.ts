import { messagingApi } from '@line/bot-sdk'
import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { createRecipe } from '@/lib/db/queries/recipes'
import { createServerClient } from '@/lib/db/client'
import { createVerticalListMessage, RecipeCardData } from './flex-message'
import { toRecipeCardUrl } from './track-redirect'

type MessagingApiClient = messagingApi.MessagingApiClient

async function replyText(client: MessagingApiClient, replyToken: string, text: string): Promise<void> {
  await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] })
}

/** テスト応答（Flex Messageでレシピカード表示） */
export async function replyTest(client: MessagingApiClient, replyToken: string, lineUserId: string): Promise<void> {
  const supabase = createServerClient()
  const { data: user, error: userError } = await supabase
    .from('users').select('id').eq('line_user_id', lineUserId).single()

  if (!user || userError) {
    await replyText(client, replyToken, 'ユーザーが見つかりません。')
    return
  }

  const { data: recipes } = await supabase
    .from('recipes').select('id, title, url, image_url, source_name')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)

  if (!recipes || recipes.length === 0) {
    await replyText(client, replyToken, 'レシピが登録されていません。まずURLを送って登録してください。')
    return
  }

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
  const recipeCards: RecipeCardData[] = recipes.map((r) => ({
    title: r.title,
    url: toRecipeCardUrl(r),
    imageUrl: r.image_url,
    sourceName: r.source_name,
  }))
  await client.replyMessage({
    replyToken,
    messages: [createVerticalListMessage(recipeCards, `https://liff.line.me/${liffId}`, recipeCards.length)],
  })
}

/** レシピを解析して保存 */
async function saveRecipe(lineUserId: string, url: string): Promise<{ success: boolean; title?: string; isDuplicate?: boolean }> {
  const parsed = await parseRecipe(url)
  const { error } = await createRecipe({
    lineUserId, url,
    title: parsed.title || 'タイトル未取得',
    sourceName: parsed.sourceName,
    imageUrl: parsed.imageUrl,
    ingredientIds: parsed.ingredientIds,
    ingredientsRaw: parsed.ingredientsRaw,
    memo: parsed.memo,
    cookingTimeMinutes: parsed.cookingTimeMinutes ?? null,
  })

  if (error) {
    if ('code' in error && error.code === '23505') return { success: false, isDuplicate: true }
    throw error
  }
  return { success: true, title: parsed.title || 'タイトル未取得' }
}

/** URL を処理してレシピ保存 */
export async function processUrl(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string,
  url: string,
  ensureUser: (lineUserId: string) => Promise<void>
): Promise<void> {
  try {
    await ensureUser(lineUserId)
    const result = await saveRecipe(lineUserId, url)
    if (result.isDuplicate) {
      await replyText(client, replyToken, 'このレシピは既に登録済みです 📝')
    } else if (result.success && result.title) {
      await replyText(client, replyToken, `✅ レシピを保存しました！\n\n📖 ${result.title}`)
    }
  } catch (err) {
    console.error('[LINE Webhook] Error processing URL:', err)
    await replyText(client, replyToken, '⚠️ レシピの取得に失敗しました。URLを確認してください。')
  }
}
