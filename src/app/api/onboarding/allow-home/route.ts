import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const { lineUserId } = await request.json() as { lineUserId: string }

  if (!lineUserId) {
    return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('line_user_id', lineUserId)

  if (error) {
    console.error('[onboarding/allow-home] Update error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
