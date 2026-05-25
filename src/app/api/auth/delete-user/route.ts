import { createServerClient } from '@/lib/db/client'
import { apiServerError } from '@/lib/api/error-response'
import { NextRequest, NextResponse } from 'next/server'

interface DeleteUserRequest {
  lineUserId: string
}

/**
 * DELETE /api/auth/delete-user
 * ユーザーアカウントとすべての関連データを削除する
 * users テーブルの ON DELETE CASCADE により recipes 等も自動削除される
 */
export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as DeleteUserRequest
  const { lineUserId } = body

  if (!lineUserId) {
    return NextResponse.json({ error: 'lineUserId は必須です' }, { status: 400 })
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
