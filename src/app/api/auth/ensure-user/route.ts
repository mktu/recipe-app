import { createServerClient } from '@/lib/db/client'
import type { Tables } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

interface EnsureUserRequest {
  lineUserId: string
  displayName: string
}

type User = Tables<'users'>

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EnsureUserRequest
  const { lineUserId, displayName } = body

  if (!lineUserId || !displayName) {
    return NextResponse.json(
      { error: 'lineUserId と displayName は必須です' },
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
      console.error('[ensure-user] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
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
    console.error('[ensure-user] Insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data as User)
}
