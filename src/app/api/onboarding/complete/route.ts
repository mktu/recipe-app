import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'
import type { Json, TablesInsert } from '@/types/database'

interface RecipeCandidate {
  url: string
  title: string
  imageUrl?: string
  cookingTimeMinutes?: number | null
  ingredientsRaw?: { name: string; amount: string }[]
}

interface CompleteRequestBody {
  lineUserId: string
  selectedCandidates: RecipeCandidate[]
}

export async function POST(request: NextRequest) {
  const body = await request.json() as CompleteRequestBody
  const { lineUserId, selectedCandidates } = body

  if (!lineUserId) {
    return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 })
  }

  const supabase = createServerClient()

  // userId を1回だけ取得
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (user && selectedCandidates.length > 0) {
    const rows: TablesInsert<'recipes'>[] = selectedCandidates.map((c) => ({
      user_id: user.id,
      url: c.url,
      title: c.title,
      image_url: c.imageUrl ?? null,
      cooking_time_minutes: c.cookingTimeMinutes ?? null,
      ingredients_raw: (c.ingredientsRaw ?? []) as unknown as Json,
      ingredients_linked: false,
    }))

    const { error } = await supabase.from('recipes').insert(rows)
    if (error) {
      console.error('[onboarding/complete] Bulk insert error:', error)
    }
  }

  // onboarding_completed_at を更新
  const { error: updateError } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('line_user_id', lineUserId)

  if (updateError) {
    console.error('[onboarding/complete] Update user error:', updateError)
  }

  // onboarding_sessions を削除（一時データ破棄）
  await supabase.from('onboarding_sessions').delete().eq('user_id', lineUserId)

  return NextResponse.json({ success: true })
}
