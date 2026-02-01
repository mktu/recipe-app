import { NextRequest, NextResponse } from 'next/server'
import { messagingApi, validateSignature, WebhookEvent, TextEventMessage } from '@line/bot-sdk'
import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { createRecipe } from '@/lib/db/queries/recipes'
import { createServerClient } from '@/lib/db/client'

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
})

/** テキストからURLを抽出 */
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
  return text.match(urlRegex) || []
}

/** ヘルプキーワードかどうかを判定 */
function isHelpKeyword(text: string): boolean {
  const keywords = ['使い方', 'ヘルプ', 'help', '?', '？']
  const normalizedText = text.trim().toLowerCase()
  return keywords.some((keyword) => normalizedText === keyword.toLowerCase())
}

/** ユーザーを確保（存在しなければ作成） */
async function ensureUser(lineUserId: string): Promise<void> {
  const supabase = createServerClient()

  // 既存ユーザーを確認
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single()

  if (existingUser) return

  // Profile API でユーザー情報を取得
  let displayName = 'LINE ユーザー'
  try {
    const profile = await client.getProfile(lineUserId)
    displayName = profile.displayName
  } catch {
    console.warn('[LINE Webhook] Failed to get profile, using default name')
  }

  // 新規ユーザーを作成
  const { error } = await supabase
    .from('users')
    .insert({ line_user_id: lineUserId, display_name: displayName })

  if (error) {
    console.error('[LINE Webhook] Failed to create user:', error)
    throw new Error('ユーザーの作成に失敗しました')
  }
}

/** URL なしの場合の応答 */
async function replyNoUrl(replyToken: string): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text: 'レシピURLを送ってください 🍳' }],
  })
}

/** ヘルプメッセージの応答 */
async function replyHelp(replyToken: string): Promise<void> {
  const helpText = `📖 RecipeHub の使い方

【レシピを保存する】
レシピサイトのURLをこのトークに送るだけ！
AIが自動で食材を解析して保存します。

【レシピを探す】
画面下のメニューから「レシピ一覧」をタップ。
食材で絞り込み検索もできます。

【対応サイト】
クックパッド、クラシル、デリッシュキッチンなど主要レシピサイトに対応しています。`

  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text: helpText }],
  })
}

/** レシピ保存成功時の応答 */
async function replySuccess(replyToken: string, title: string): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text: `✅ レシピを保存しました！\n\n📖 ${title}` }],
  })
}

/** 重複URL時の応答 */
async function replyDuplicate(replyToken: string): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text: 'このレシピは既に登録済みです 📝' }],
  })
}

/** エラー時の応答 */
async function replyError(replyToken: string): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text: '⚠️ レシピの取得に失敗しました。URLを確認してください。' }],
  })
}

/** レシピを解析して保存 */
async function saveRecipe(lineUserId: string, url: string): Promise<{ success: boolean; title?: string; isDuplicate?: boolean }> {
  const parsed = await parseRecipe(url)

  const { error } = await createRecipe({
    lineUserId,
    url,
    title: parsed.title || 'タイトル未取得',
    sourceName: parsed.sourceName,
    imageUrl: parsed.imageUrl,
    ingredientIds: parsed.ingredientIds,
    memo: parsed.memo,
  })

  if (error) {
    if ('code' in error && error.code === '23505') {
      return { success: false, isDuplicate: true }
    }
    throw error
  }

  return { success: true, title: parsed.title || 'タイトル未取得' }
}

/** 保存結果に応じて応答 */
async function replyWithResult(
  replyToken: string,
  result: { success: boolean; title?: string; isDuplicate?: boolean }
): Promise<void> {
  if (result.isDuplicate) {
    await replyDuplicate(replyToken)
  } else if (result.success && result.title) {
    await replySuccess(replyToken, result.title)
  }
}

/** URL を処理してレシピ保存 */
async function processUrl(replyToken: string, lineUserId: string, url: string): Promise<void> {
  try {
    await ensureUser(lineUserId)
    const result = await saveRecipe(lineUserId, url)
    await replyWithResult(replyToken, result)
  } catch (err) {
    console.error('[LINE Webhook] Error processing URL:', err)
    await replyError(replyToken)
  }
}

/** メッセージイベントを処理 */
async function handleMessageEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== 'message' || event.message.type !== 'text') return
  if (!event.replyToken || !event.source?.userId) return

  const message = event.message as TextEventMessage
  const text = message.text

  // ヘルプキーワードの場合
  if (isHelpKeyword(text)) {
    await replyHelp(event.replyToken)
    return
  }

  // URL を抽出
  const urls = extractUrls(text)

  if (urls.length === 0) {
    await replyNoUrl(event.replyToken)
    return
  }

  await processUrl(event.replyToken, event.source.userId, urls[0])
}

/**
 * POST /api/webhook/line
 * LINE Messaging API の Webhook エンドポイント
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text()
  const signature = request.headers.get('x-line-signature') || ''

  // 署名検証
  if (!validateSignature(bodyText, config.channelSecret, signature)) {
    console.error('[LINE Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(bodyText) as { events: WebhookEvent[] }

  // 各イベントを処理
  await Promise.all(
    body.events.map((event) => handleMessageEvent(event))
  )

  return NextResponse.json({ status: 'ok' })
}
