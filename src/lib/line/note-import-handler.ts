import type { messagingApi } from '@line/bot-sdk'
import { parseRecipeMarkdown } from '@/lib/recipe/note-markdown/parse-recipe-markdown'
import { saveRecipeNote } from '@/lib/recipe/save-recipe-note'
import { buildNotRegistrableText, buildPrefixHintText, buildRegisteredMessages } from './note-import-messages'
import { replyErrorText } from './reply-error'

type MessagingApiClient = messagingApi.MessagingApiClient

async function replyText(client: MessagingApiClient, replyToken: string, text: string): Promise<void> {
  await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] })
}

/**
 * 接頭語付きのレシピ Markdown をノートとして登録し、結果を返信する（#208）
 *
 * LINE ではワンパスで登録する（確認画面は挟まない）。登録してよいかはパーサの `registrable` だけで決め、
 * ここで条件を書き直さない（`docs/NOTE_MARKDOWN_FORMAT.md`）。
 */
export async function handleRecipeNoteImport(
  client: MessagingApiClient,
  replyToken: string,
  lineUserId: string,
  text: string,
  ensureUser: (lineUserId: string) => Promise<void>
): Promise<void> {
  try {
    const parsed = parseRecipeMarkdown(text)
    if (!parsed.registrable) {
      await replyText(client, replyToken, buildNotRegistrableText(parsed.blockingReasons))
      return
    }

    await ensureUser(lineUserId)
    const { data, error } = await saveRecipeNote(lineUserId, parsed.fields)
    if (error || !data) throw new Error(error?.message ?? 'レシピノートの作成に失敗しました')

    await replyRegistered(client, replyToken, buildRegisteredMessages(parsed.fields, parsed.warnings, data))
  } catch (err) {
    console.error('[LINE Webhook] Note import error:', err)
    await replyErrorText(client, replyToken, '⚠️ レシピノートの登録に失敗しました。時間をおいてもう一度送ってください。')
  }
}

/**
 * 登録済みの結果を返信する。ここでの失敗を「登録に失敗」と伝えると、
 * ユーザーが送り直して同じノートが2件できるので、登録はできたことを伝える
 */
async function replyRegistered(
  client: MessagingApiClient,
  replyToken: string,
  messages: messagingApi.Message[]
): Promise<void> {
  try {
    await client.replyMessage({ replyToken, messages })
  } catch (err) {
    console.error('[LINE Webhook] Note import reply error:', err)
    await replyErrorText(client, replyToken, '✅ レシピノートは登録しました。結果の表示に失敗したので、レシピ一覧から確認してください。')
  }
}

/** 接頭語の無いレシピらしい文に、接頭語を付けて送り直すよう案内する */
export async function replyRecipePrefixHint(client: MessagingApiClient, replyToken: string): Promise<void> {
  await replyText(client, replyToken, buildPrefixHintText())
}
