import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  const lineUserId = request.nextUrl.searchParams.get('lineUserId')

  if (!lineUserId) {
    return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data } = await supabase
    .from('users')
    .select('onboarding_completed_at')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  const completed = data?.onboarding_completed_at != null

  return NextResponse.json({ completed })
}
