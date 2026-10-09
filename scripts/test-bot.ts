/**
 * LINE Botレスポンステストスクリプト
 *
 * 使用方法:
 *   npm run test:bot "食材"
 *   npm run test:bot "鶏肉 玉ねぎ"
 *   npm run test:bot "使い方"
 *   npm run test:bot -- --file recipe.md   # [レシピ入力] 付きの Markdown はノートとして登録される
 *
 * 前提条件:
 *   - ローカル Supabase が起動していること (supabase start)
 *   - 開発用ユーザー (dev-user-001) がシードされていること
 */

import * as fs from 'fs'
import * as path from 'path'

// .env.local から環境変数を読み込む（importより先に実行）
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

const LINE_USER_ID = process.env.LINE_USER_ID || 'dev-user-001'

async function main() {
  // 環境変数設定後に動的import
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lineBotSdk = await import('@line/bot-sdk')
  const { isIngredientSearchKeyword, handleIngredientSearchPrompt, handleSearch, isRecentlyViewedKeyword, isMostViewedKeyword, handleRecentlyViewed, handleMostViewed } = await import(
    '../src/lib/line/search-handler'
  )
  const { resolveMessageRoute } = await import('../src/lib/line/message-route')
  const { handleRecipeNoteImport, replyRecipePrefixHint } = await import('../src/lib/line/note-import-handler')
  const { isSearchKeyword, isYokuTsukuruKeyword, isShortCookingTimeKeyword, isFewIngredientsKeyword, isOkiniiriKeyword, handleSearchCategoryPrompt, handleYokuTsukuru, handleShortCookingTime, handleFewIngredients, handleFavorites } = await import(
    '../src/lib/line/category-handler'
  )

  type MessagingApiClient = lineBotSdk.messagingApi.MessagingApiClient
  type Message = lineBotSdk.messagingApi.Message
  type TextMessage = lineBotSdk.messagingApi.TextMessage
  type FlexMessage = lineBotSdk.messagingApi.FlexMessage
  type MessageAction = lineBotSdk.messagingApi.MessageAction
  type URIAction = lineBotSdk.messagingApi.URIAction
  type QuickReplyItem = lineBotSdk.messagingApi.QuickReplyItem
  type ReplyMessageResponse = lineBotSdk.messagingApi.ReplyMessageResponse

  // キャプチャされたレスポンス
  interface CapturedResponse {
    messages: Message[]
  }

  // モッククライアントを作成
  function createMockClient() {
    let captured: CapturedResponse | null = null

    const client = {
      replyMessage: async (request: { replyToken: string; messages: Message[] }) => {
        captured = { messages: request.messages }
        return {} as ReplyMessageResponse
      },
    } as unknown as MessagingApiClient

    return {
      client,
      getResponse: () => captured,
    }
  }

  // ダミーのensureUser関数
  async function ensureUser(): Promise<void> {
    // 開発用ユーザーは既にシードされているので何もしない
  }

  // ヘルプキーワード判定
  function isHelpKeyword(text: string): boolean {
    const keywords = ['使い方', 'ヘルプ', 'help', '?', '？']
    const normalizedText = text.trim().toLowerCase()
    return keywords.some((keyword) => normalizedText === keyword.toLowerCase())
  }

  // クイックリプライを整形
  function formatQuickReply(items: QuickReplyItem[]): void {
    console.log('\n   quickReply:')
    for (const item of items) {
      if (item.action?.type === 'message') {
        const action = item.action as MessageAction
        console.log(`     - [${action.label}] → "${action.text}"`)
      } else if (item.action?.type === 'uri') {
        const action = item.action as URIAction
        console.log(`     - [${action.label}] → ${action.uri}`)
      }
    }
  }

  // レスポンスを整形して出力
  function formatResponse(response: CapturedResponse): void {
    for (const msg of response.messages) {
      console.log('\n📥 Response:')
      console.log(`   type: ${msg.type}`)

      if (msg.type === 'text') {
        const textMsg = msg as TextMessage
        console.log(`   text: ${textMsg.text.replace(/\n/g, '\n         ')}`)
        if (textMsg.quickReply?.items) {
          formatQuickReply(textMsg.quickReply.items)
        }
      } else if (msg.type === 'flex') {
        const flexMsg = msg as FlexMessage
        console.log(`   altText: ${flexMsg.altText}`)
        console.log(`   contents: (Flex Message)`)
      }
    }
  }

  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: npm run test:bot "<message>"')
    console.log('')
    console.log('Examples:')
    console.log('  npm run test:bot "食材"')
    console.log('  npm run test:bot "鶏肉 玉ねぎ"')
    console.log('  npm run test:bot "使い方"')
    process.exit(1)
  }

  // --file <path>: 複数行のメッセージ（レシピ Markdown など）をファイルから読む
  const text = args[0] === '--file' ? fs.readFileSync(args[1], 'utf-8') : args[0]
  console.log('🧪 LINE Bot Response Test')
  console.log('='.repeat(40))
  console.log(`📤 Input: "${text}"`)
  console.log(`👤 User: ${LINE_USER_ID}`)

  const { client, getResponse } = createMockClient()
  const replyToken = 'test-reply-token'

  try {
    // ヘルプキーワードの場合
    if (isHelpKeyword(text)) {
      console.log('\n🔀 Route: Help')
      const helpText = `📖 RecipeHub の使い方

【レシピを保存する】
レシピサイトのURLをこのトークに送るだけ！
AIが自動で食材を解析して保存します。

【レシピを探す】
画面下のメニューから「レシピ一覧」をタップ。
食材で絞り込み検索もできます。

【対応サイト】
クックパッド、クラシル、デリッシュキッチンなど主要レシピサイトに対応しています。`
      console.log('\n📥 Response:')
      console.log(`   type: text`)
      console.log(`   text: ${helpText.replace(/\n/g, '\n         ')}`)
      return
    }

    // カテゴリ系キーワード
    if (isSearchKeyword(text)) {
      console.log('\n🔀 Route: Search Category Prompt')
      await handleSearchCategoryPrompt(client, replyToken)
    } else if (isOkiniiriKeyword(text)) {
      console.log('\n🔀 Route: Favorites')
      await handleFavorites(client, replyToken)
    } else if (isYokuTsukuruKeyword(text)) {
      console.log('\n🔀 Route: Yoku Tsukuru')
      await handleYokuTsukuru(client, replyToken, LINE_USER_ID)
    } else if (isFewIngredientsKeyword(text)) {
      console.log('\n🔀 Route: Few Ingredients')
      await handleFewIngredients(client, replyToken, LINE_USER_ID)
    } else if (isShortCookingTimeKeyword(text)) {
      console.log('\n🔀 Route: Short Cooking Time')
      await handleShortCookingTime(client, replyToken, LINE_USER_ID)
    } else if (isRecentlyViewedKeyword(text)) {
      console.log('\n🔀 Route: Recently Viewed')
      await handleRecentlyViewed(client, replyToken, LINE_USER_ID)
    } else if (isMostViewedKeyword(text)) {
      console.log('\n🔀 Route: Most Viewed')
      await handleMostViewed(client, replyToken, LINE_USER_ID)
    } else if (isIngredientSearchKeyword(text)) {
      console.log('\n🔀 Route: Ingredient Search Prompt')
      await handleIngredientSearchPrompt(client, replyToken, LINE_USER_ID)
    } else {
      // キーワード以外は Webhook と同じく resolveMessageRoute で振り分ける（URL 登録はここでは扱わない）
      const route = resolveMessageRoute(text)
      console.log(`\n🔀 Route: ${route}`)
      if (route === 'note') {
        await handleRecipeNoteImport(client, replyToken, LINE_USER_ID, text, ensureUser)
      } else if (route === 'note-hint') {
        await replyRecipePrefixHint(client, replyToken)
      } else {
        await handleSearch(client, replyToken, LINE_USER_ID, text, ensureUser)
      }
    }

    const response = getResponse()
    if (response) {
      formatResponse(response)
    } else {
      console.log('\n⚠️  No response captured')
    }
  } catch (err) {
    console.error('\n❌ Error:', err)
    process.exit(1)
  }
}

main()
