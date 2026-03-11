import { NextRequest, NextResponse } from 'next/server'
import { messagingApi, validateSignature, WebhookEvent, TextEventMessage } from '@line/bot-sdk'
import { createServerClient } from '@/lib/db/client'
import { handleSearch, isIngredientSearchKeyword, handleIngredientSearchPrompt, isRecentlyViewedKeyword, isMostViewedKeyword, handleRecentlyViewed, handleMostViewed } from '@/lib/line/search-handler'
import { isSearchKeyword, isYokuTsukuruKeyword, isShortCookingTimeKeyword, isFewIngredientsKeyword, isOkiniiriKeyword, isRecentlyAddedKeyword, handleSearchCategoryPrompt, handleYokuTsukuru, handleShortCookingTime, handleFewIngredients, handleFavorites, handleRecentlyAdded } from '@/lib/line/category-handler'
import { replyTest, processUrl } from '@/lib/line/url-handler'

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
  return keywords.some((k) => text.trim().toLowerCase() === k.toLowerCase())
}

/** テストキーワードかどうかを判定 */
function isTestKeyword(text: string): boolean {
  return ['テスト', 'test'].includes(text.trim().toLowerCase())
}

/** ユーザーを確保（存在しなければ作成） */
export async function ensureUser(lineUserId: string): Promise<void> {
  const supabase = createServerClient()
  const { data: existingUser } = await supabase
    .from('users').select('id').eq('line_user_id', lineUserId).single()
  if (existingUser) return

  let displayName = 'LINE ユーザー'
  try {
    const profile = await client.getProfile(lineUserId)
    displayName = profile.displayName
  } catch {
    console.warn('[LINE Webhook] Failed to get profile, using default name')
  }

  const { error } = await supabase
    .from('users').insert({ line_user_id: lineUserId, display_name: displayName })
  if (error) {
    console.error('[LINE Webhook] Failed to create user:', error)
    throw new Error('ユーザーの作成に失敗しました')
  }
}

/** ヘルプメッセージの応答 */
async function replyHelp(replyToken: string): Promise<void> {
  const helpText = `📖 RecipeHub の使い方

【レシピを保存する】
レシピサイトのURLをこのトークに送るだけ！
AIが自動で食材を解析して保存します。

【レシピを探す】
「探す」と送るとカテゴリから選べます。
食材名やキーワードで直接検索もできます。

【対応サイト】
クックパッド、クラシル、デリッシュキッチンなど主要レシピサイトに対応しています。`

  await client.replyMessage({ replyToken, messages: [{ type: 'text', text: helpText }] })
}

type KeywordEntry = [(t: string) => boolean, () => Promise<void>]

function buildKeywordHandlers(replyToken: string, userId: string): KeywordEntry[] {
  return [
    [isHelpKeyword, () => replyHelp(replyToken)],
    [isSearchKeyword, () => handleSearchCategoryPrompt(client, replyToken)],
    [isOkiniiriKeyword, () => handleFavorites(client, replyToken)],
    [isRecentlyAddedKeyword, () => handleRecentlyAdded(client, replyToken, userId)],
    [isYokuTsukuruKeyword, () => handleYokuTsukuru(client, replyToken, userId)],
    [isFewIngredientsKeyword, () => handleFewIngredients(client, replyToken, userId)],
    [isShortCookingTimeKeyword, () => handleShortCookingTime(client, replyToken, userId)],
    [isRecentlyViewedKeyword, () => handleRecentlyViewed(client, replyToken, userId)],
    [isMostViewedKeyword, () => handleMostViewed(client, replyToken, userId)],
    [isIngredientSearchKeyword, () => handleIngredientSearchPrompt(client, replyToken, userId)],
    [isTestKeyword, () => replyTest(client, replyToken, userId)],
  ]
}

/** キーワードを処理。処理済みなら true を返す */
async function handleKeyword(text: string, replyToken: string, userId: string): Promise<boolean> {
  const match = buildKeywordHandlers(replyToken, userId).find(([isMatch]) => isMatch(text))
  if (!match) return false
  await match[1]()
  return true
}

/** 友達追加・ブロック解除イベントを処理 */
async function handleFollowEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== 'follow' || !event.source?.userId) return
  const { userId } = event.source

  await ensureUser(userId)

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const onboardingUrl = liffId
    ? `https://liff.line.me/${liffId}/onboarding`
    : `${appUrl}/onboarding`

  await client.pushMessage({
    to: userId,
    messages: [
      {
        type: 'flex',
        altText: 'RecipeHub へようこそ！まず好みのレシピを探してみましょう。',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'RecipeHub へようこそ！🍳', weight: 'bold', size: 'lg' },
              {
                type: 'text',
                text: 'まず、好みに合ったレシピを一緒に探してみましょう。\n下のボタンからはじめてください👇',
                size: 'sm',
                color: '#666666',
                margin: 'md',
                wrap: true,
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                action: { type: 'uri', label: 'レシピを探す', uri: onboardingUrl },
              },
            ],
          },
        },
      },
    ],
  })
}

/** メッセージイベントを処理 */
async function handleMessageEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== 'message' || event.message.type !== 'text') return
  if (!event.replyToken || !event.source?.userId) return

  const text = (event.message as TextEventMessage).text
  const { replyToken, source: { userId } } = event

  if (await handleKeyword(text, replyToken, userId)) return

  const urls = extractUrls(text)
  if (urls.length > 0) {
    await processUrl(client, replyToken, userId, urls[0], ensureUser)
    return
  }

  await handleSearch(client, replyToken, userId, text, ensureUser)
}

/**
 * POST /api/webhook/line
 * LINE Messaging API の Webhook エンドポイント
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text()
  const signature = request.headers.get('x-line-signature') || ''

  if (!validateSignature(bodyText, config.channelSecret, signature)) {
    console.error('[LINE Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(bodyText) as { events: WebhookEvent[] }
  await Promise.all(body.events.map((event) => Promise.all([
    handleFollowEvent(event),
    handleMessageEvent(event),
  ])))

  return NextResponse.json({ status: 'ok' })
}
