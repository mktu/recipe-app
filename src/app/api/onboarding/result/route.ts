import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  const lineUserId = request.nextUrl.searchParams.get('lineUserId')

  if (!lineUserId) {
    return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data } = await supabase
    .from('onboarding_sessions')
    .select('id, status, candidates, expires_at')
    .eq('user_id', lineUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ session: null })
  }

  // 期限切れチェック
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ session: null })
  }

  return NextResponse.json({
    session: {
      id: data.id,
      status: data.status,
      candidates: data.candidates,
      expiresAt: data.expires_at,
    },
  })
}
