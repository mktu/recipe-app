import { createServerClient } from '@/lib/db/client'
import { apiServerError } from '@/lib/api/error-response'
import { requireLineUser } from '@/lib/api/auth-guard'
import { NextRequest, NextResponse } from 'next/server'

interface DeleteUserRequest {
  accessToken: string
}

async function getStatelessChannelAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_LIFF_ID?.split('-')[0]
  const clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('NEXT_PUBLIC_LIFF_ID または LINE_LOGIN_CHANNEL_SECRET が未設定です')
  }

  const res = await fetch('https://api.line.me/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('[delete-user] channel token failed:', res.status, body)
    throw new Error('チャンネルアクセストークンの取得に失敗しました')
  }

  const { access_token } = (await res.json()) as { access_token: string }
  return access_token
}

async function deauthorize(channelAccessToken: string, userAccessToken: string): Promise<void> {
  const res = await fetch('https://api.line.me/user/v1/deauthorize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userAccessToken }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('[delete-user] deauthorize failed:', res.status, body)
    throw new Error('deauthorize に失敗しました')
  }
}

/**
 * DELETE /api/auth/delete-user
 * LINE 認可を取り消してユーザーアカウントとすべての関連データを削除する
 * users テーブルの ON DELETE CASCADE により recipes 等も自動削除される
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth
  const lineUserId = auth

  const body = (await request.json()) as DeleteUserRequest
  const { accessToken } = body

  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken は必須です' }, { status: 400 })
  }

  try {
    const channelAccessToken = await getStatelessChannelAccessToken()
    await deauthorize(channelAccessToken, accessToken)
  } catch (err) {
    console.error('[delete-user]', err)
    return NextResponse.json({ error: 'LINE 認可の取り消しに失敗しました' }, { status: 500 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('line_user_id', lineUserId)

  if (error) {
    return apiServerError(error, 'delete-user')
  }

  return NextResponse.json({ success: true })
}
