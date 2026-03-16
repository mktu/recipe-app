import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

interface OnboardingPreferences {
  searchQuery: string
  dislikedIngredients: string[]
  maxCookingMinutes: number | null
}

interface StartRequestBody {
  lineUserId: string
  preferences: OnboardingPreferences
}

export async function POST(request: NextRequest) {
  const body = await request.json() as StartRequestBody
  const { lineUserId, preferences } = body

  if (!lineUserId || !preferences?.searchQuery) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 冪等性チェック: pending かつ未期限のセッションが既存なら返す
  const { data: existing } = await supabase
    .from('onboarding_sessions')
    .select('id')
    .eq('user_id', lineUserId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ sessionId: existing.id }, { status: 202 })
  }

  const { data: session, error } = await supabase
    .from('onboarding_sessions')
    .insert({ user_id: lineUserId, preferences: preferences as unknown as import('@/types/database').Json })
    .select('id')
    .single()

  if (error || !session) {
    console.error('[onboarding/start] Insert failed:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    // 非同期で Edge Function を起動（await しない）
    fetch(`${supabaseUrl}/functions/v1/onboarding-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sessionId: session.id }),
    }).catch((err) => {
      console.error('[onboarding/start] Edge Function kick failed:', err)
    })
  }

  return NextResponse.json({ sessionId: session.id }, { status: 202 })
}
