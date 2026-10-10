import type { messagingApi } from '@line/bot-sdk'

type MessagingApiClient = messagingApi.MessagingApiClient

/** テキスト1通で返信する */
export async function replyText(client: MessagingApiClient, replyToken: string, text: string): Promise<void> {
  await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] })
}

/**
 * catch 内からのエラー通知用。失敗しても投げない
 *
 * 本命の reply が失敗した時点で replyToken が使えなくなっていることがあり、
 * そのまま投げると webhook 全体が 500 になってユーザーには「既読のみ・無反応」に見える（#170）。
 * ここで握ってログに残せば、少なくとも原因が追える形で終われる。
 */
export async function replyErrorText(client: MessagingApiClient, replyToken: string, text: string): Promise<void> {
  try {
    await replyText(client, replyToken, text)
  } catch (err) {
    console.error('[LINE Webhook] エラー通知の返信にも失敗:', err)
  }
}

/**
 * reply が失敗した後に、どうしても伝えたいことを push で送る。失敗しても投げない
 *
 * **失敗した reply の replyToken は再利用できない**（`docs/LINE_SETUP.md`）ので、
 * `replyErrorText` では届かない。push は無料プランの月間通数を消費するため、
 * 「登録はできた」のように、伝わらないと実害が出る場面に限って使う。
 */
export async function pushTextSafely(client: MessagingApiClient, lineUserId: string, text: string): Promise<void> {
  try {
    await client.pushMessage({ to: lineUserId, messages: [{ type: 'text', text }] })
  } catch (err) {
    console.error('[LINE Webhook] push での通知にも失敗:', err)
  }
}
