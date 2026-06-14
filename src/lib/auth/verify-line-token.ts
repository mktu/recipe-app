import { DEV_USER } from './constants'

/**
 * LIFF チャネル ID（LINE Login チャネル）を返す。
 * NEXT_PUBLIC_LIFF_ID は "<channelId>-<liffId>" 形式のため先頭を取り出す。
 * 未設定（dev モード）の場合は null。
 */
function getLineChannelId(): string | null {
  return process.env.NEXT_PUBLIC_LIFF_ID?.split('-')[0] || null
}

interface VerifyResponse {
  /** ユーザー ID（LINE userId） */
  sub: string
  /** audience（チャネル ID） */
  aud: string
  iss: string
  exp: number
}

/**
 * LIFF の ID トークン（JWT）を LINE のエンドポイントで検証し、
 * 検証済みの lineUserId（sub）を返す。
 *
 * - 署名・有効期限・audience（チャネル ID）は LINE 側で検証される
 * - 失敗時は null
 *
 * dev モード（NEXT_PUBLIC_LIFF_ID 未設定）では検証をスキップし、
 * DEV_USER の lineUserId を返してローカル開発を維持する。
 */
export async function verifyLineToken(idToken: string | null): Promise<string | null> {
  const channelId = getLineChannelId()

  // dev モード: 検証スキップ
  if (!channelId) {
    return DEV_USER.lineUserId
  }

  if (!idToken) return null

  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId,
      }),
    })

    if (!res.ok) {
      console.warn('[verifyLineToken] verify failed:', res.status)
      return null
    }

    const data = (await res.json()) as VerifyResponse

    // 二重チェック: audience がこのチャネルと一致すること
    if (data.aud !== channelId) {
      console.warn('[verifyLineToken] aud mismatch')
      return null
    }

    return data.sub
  } catch (err) {
    console.error('[verifyLineToken]', err)
    return null
  }
}
