import { createServerClient } from '@/lib/db/client'
import { apiServerError } from '@/lib/api/error-response'
import { NextRequest, NextResponse } from 'next/server'

interface DeleteUserRequest {
  lineUserId: string
  accessToken: string
}

async function deauthorize(accessToken: string): Promise<void> {
  const res = await fetch('https://api.line.me/user/v1/deauthorize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('[delete-user] deauthorize failed:', res.status, body, 'token length:', accessToken.length)
    throw new Error('deauthorize に失敗しました')
  }
}

/**
 * DELETE /api/auth/delete-user
 * LINE 認可を取り消してユーザーアカウントとすべての関連データを削除する
 * users テーブルの ON DELETE CASCADE により recipes 等も自動削除される
 */
export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as DeleteUserRequest
  const { lineUserId, accessToken } = body

  if (!lineUserId || !accessToken) {
    return NextResponse.json({ error: 'lineUserId と accessToken は必須です' }, { status: 400 })
  }

  try {
    await deauthorize(accessToken)
  } catch {
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
