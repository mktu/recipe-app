import type { messagingApi } from '@line/bot-sdk'
import { RECIPE_NOTE_PROMPT } from '@/lib/recipe/note-markdown/prompt'

type Message = messagingApi.Message
type TextMessage = messagingApi.TextMessage
type QuickReplyItem = messagingApi.QuickReplyItem

/**
 * LINE の案内メッセージ（#201）
 *
 * LINE では「ノート」という概念を見せず、「トークに送れるものが増えた」と見せる。
 * 用語は「マイレシピ」（#219）。「AI」はラベルに出さず、触れるのは「書式を見る」の説明だけにする
 * （一番上の案内に AI が出ると、アプリが AI でレシピを作るように読めるため）。
 */

/** リッチメニュー「レシピ追加」が送るテキスト。リッチメニューの設定（docs/LINE_SETUP.md）と揃える */
export const RECIPE_ADD_KEYWORD = 'レシピ追加'

/** 書式を返すキーワード。クイックリプライのラベル兼送信テキスト */
export const FORMAT_KEYWORD = '書式を見る'

/** 「レシピ追加」キーワードかどうかを判定 */
export function isRecipeAddKeyword(text: string): boolean {
  return text.trim() === RECIPE_ADD_KEYWORD
}

/** 「書式を見る」キーワードかどうかを判定 */
export function isFormatKeyword(text: string): boolean {
  return [FORMAT_KEYWORD, '書式'].includes(text.trim())
}

/** 「書式を見る」を送るクイックリプライ */
export function buildFormatQuickReplyItem(): QuickReplyItem {
  return { type: 'action', action: { type: 'message', label: FORMAT_KEYWORD, text: FORMAT_KEYWORD } }
}

/**
 * マイレシピの作成画面を開くクイックリプライ
 *
 * LIFF URL を uri に直接載せる。302 を挟むと LIFF を閉じたあとに空白ページが残る（#203、docs/LINE_SETUP.md）。
 * LIFF_ID が空の dev では LIFF URL を作れないので出さない。
 */
function buildWriteRecipeQuickReplyItem(): QuickReplyItem | null {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) return null
  return { type: 'action', action: { type: 'uri', label: 'マイレシピを書く', uri: `https://liff.line.me/${liffId}/notes/new` } }
}

/**
 * レシピの追加方法の案内。「レシピ追加」「使い方」・友だち追加時のあいさつで共通に使う
 *
 * 3つの方法は横並びにする。② を「自分で書きたい場合」の下に置くと、ChatGPT などで考えたレシピを
 * 持っている人が「自分で書くわけじゃない」と読み飛ばすため。① は貼るだけなのでボタンを付けない。
 * クイックリプライは最後の吹き出しにしか出ないので、複数通で返すときはこれを最後に置くこと。
 */
export function buildRecipeAddGuideMessage(): TextMessage {
  const text = [
    '📝 レシピの追加方法は3つです',
    '① レシピサイトの URL を、このトークに送る\n② 書式に沿ったレシピを、このトークに貼って送る\n③ アプリの画面で、自分で書く',
    `②の書式は「${FORMAT_KEYWORD}」から確認できます`,
  ].join('\n\n')
  const writeItem = buildWriteRecipeQuickReplyItem()
  const items = writeItem ? [buildFormatQuickReplyItem(), writeItem] : [buildFormatQuickReplyItem()]
  return { type: 'text', text, quickReply: { items } }
}

/**
 * 「書式を見る」の返信。説明と書式（AI に渡す指示文）本体を別の吹き出しにする
 *
 * 長押しのコピー1回で指示文だけが取れるようにするため、説明と混ぜない。1通5000文字までは prompt.test.ts で確かめている。
 * 次の吹き出しは書式そのものではなく AI 向けの指示文なので、説明でそう読ませない。手で書く人が指示文を
 * そのまま送り返すと、出力例の送り返し対策（#217）で弾かれて何も保存されない。手で書く人には中の「出力例」を
 * 見本にしてもらう（押すのは大半が AI を使う人で、手で書くならフォームのほうが楽なので、こちらは補足）。
 */
export function buildFormatMessages(): Message[] {
  return [
    {
      type: 'text',
      text: 'ChatGPT などで考えたレシピを保存するときは、次のメッセージをそのまま AI に渡してください。このトークに貼れる形で出してくれます。\n\n自分で書くときは、次のメッセージの中の「出力例」の形で送れば保存できます。',
    },
    { type: 'text', text: RECIPE_NOTE_PROMPT },
  ]
}

/** ヘルプキーワードかどうかを判定 */
export function isHelpKeyword(text: string): boolean {
  const keywords = ['使い方', 'ヘルプ', 'help', '?', '？']
  return keywords.some((k) => text.trim().toLowerCase() === k.toLowerCase())
}

/** 「使い方」の返信。追加方法は共通の案内に任せ、ここでは探し方を書く */
export function buildHelpMessages(): Message[] {
  const text = `📖 RecipeHub の使い方

【レシピを探す】
「探す」と送るとカテゴリから選べます。
食材名やキーワードで直接検索もできます。

【対応サイト】
クックパッド、クラシル、デリッシュキッチンなど主要レシピサイトの URL に対応しています。`
  return [{ type: 'text', text }, buildRecipeAddGuideMessage()]
}

/** 友だち追加時のあいさつ。追加方法の案内を最後に置き、クイックリプライを出す */
export function buildWelcomeMessages(appUrl: string): Message[] {
  return [
    { type: 'text', text: 'RecipeHub へようこそ！🍳\n\nレシピをこのトークに送って、自分だけのレシピ帳を作れます。' },
    {
      type: 'text',
      text: `ご利用にあたっては、以下の利用規約・プライバシーポリシーをご確認ください。本サービスのご利用をもって、これらに同意いただいたものとみなします。\n\n📄 利用規約\n${appUrl}/terms\n\n🔒 プライバシーポリシー\n${appUrl}/privacy`,
    },
    buildRecipeAddGuideMessage(),
  ]
}
