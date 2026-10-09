import type { messagingApi } from '@line/bot-sdk'

/**
 * catch 内からのエラー通知用。失敗しても投げない
 *
 * 本命の reply が失敗した時点で replyToken が使えなくなっていることがあり、
 * そのまま投げると webhook 全体が 500 になってユーザーには「既読のみ・無反応」に見える（#170）。
 * ここで握ってログに残せば、少なくとも原因が追える形で終われる。
 */
export async function replyErrorText(
  client: messagingApi.MessagingApiClient,
  replyToken: string,
  text: string
): Promise<void> {
  try {
    await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] })
  } catch (err) {
    console.error('[LINE Webhook] エラー通知の返信にも失敗:', err)
  }
}
