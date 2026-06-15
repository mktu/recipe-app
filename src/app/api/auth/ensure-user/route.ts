import { createServerClient } from '@/lib/db/client'
import { apiServerError } from '@/lib/api/error-response'
import { requireLineUser } from '@/lib/api/auth-guard'
import type { Tables } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

interface EnsureUserRequest {
  displayName: string
}

type User = Tables<'users'>

export async function POST(request: NextRequest) {
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth
  const lineUserId = auth

  const body = (await request.json()) as EnsureUserRequest
  const { displayName } = body

  if (!displayName) {
    return NextResponse.json(
      { error: 'displayName は必須です' },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  // 既存ユーザーを確認
  const { data: existingUser } = await supabase
    .from('users')
    .select()
    .eq('line_user_id', lineUserId)
    .single()

  if (existingUser) {
    // 既存ユーザーの display_name を更新
    const { data, error } = await supabase
      .from('users')
      .update({ display_name: displayName })
      .eq('line_user_id', lineUserId)
      .select()
      .single()

    if (error) {
      return apiServerError(error, 'ensure-user: update')
    }
    return NextResponse.json(data as User)
  }

  // 新規ユーザーを作成
  const { data, error } = await supabase
    .from('users')
    .insert({ line_user_id: lineUserId, display_name: displayName })
    .select()
    .single()

  if (error) {
    return apiServerError(error, 'ensure-user: insert')
  }

  return NextResponse.json(data as User)
}
