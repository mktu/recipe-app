import { messagingApi } from '@line/bot-sdk'
import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { isOwnAppUrl } from '@/lib/recipe/own-app-url'
import { UNFETCHABLE_MESSAGE } from '@/lib/recipe/unfetchable-url'
import { createRecipe } from '@/lib/db/queries/recipes'
import { createServerClient } from '@/lib/db/client'
import type { RecipeCardData } from './flex-message'
import { createVerticalListMessage } from './vertical-list-message'
import { toRecipeCardUrl } from './track-redirect'
import { replyText } from './reply'

type MessagingApiClient = messagingApi.MessagingApiClient

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
    recipeId: r.id,
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

type SaveResult = { status: 'saved'; title: string } | { status: 'duplicate' } | { status: 'unfetchable' }

/** レシピを解析して保存 */
async function saveRecipe(lineUserId: string, url: string): Promise<SaveResult> {
  const parsed = await parseRecipe(url)
  // 取得できない URL は登録しない（#242）
  if (!parsed) return { status: 'unfetchable' }

  const { error } = await createRecipe({
    lineUserId, url,
    title: parsed.title,
    sourceName: parsed.sourceName,
    imageUrl: parsed.imageUrl,
    ingredientIds: parsed.ingredientIds,
    ingredientsRaw: parsed.ingredientsRaw,
    memo: parsed.memo,
    cookingTimeMinutes: parsed.cookingTimeMinutes ?? null,
  })

  if (error) {
    if ('code' in error && error.code === '23505') return { status: 'duplicate' }
    throw error
  }
  return { status: 'saved', title: parsed.title }
}

function saveReplyText(result: SaveResult): string {
  switch (result.status) {
    case 'saved': return `✅ レシピを保存しました！\n\n📖 ${result.title}`
    case 'duplicate': return 'このレシピは既に登録済みです 📝'
    case 'unfetchable': return UNFETCHABLE_MESSAGE
  }
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
    // アプリ自身のページは取得しても中身の無いレシピになるので登録しない（#230）。
    // 返信の失敗を webhook まで投げないよう try の中に置く（#170）
    if (isOwnAppUrl(url)) {
      await replyText(client, replyToken, 'RecipeHub のページは登録できません。レシピサイトの URL を送ってください。')
      return
    }

    await ensureUser(lineUserId)
    const result = await saveRecipe(lineUserId, url)
    await replyText(client, replyToken, saveReplyText(result))
  } catch (err) {
    console.error('[LINE Webhook] Error processing URL:', err)
    await replyText(client, replyToken, '⚠️ レシピの取得に失敗しました。URLを確認してください。')
  }
}
