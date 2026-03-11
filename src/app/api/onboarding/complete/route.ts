import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'
import { createRecipe } from '@/lib/db/queries/recipes'
import type { CreateRecipeInput } from '@/types/recipe'

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

  // 選択されたレシピを順次登録
  for (const candidate of selectedCandidates) {
    const input: CreateRecipeInput = {
      lineUserId,
      url: candidate.url,
      title: candidate.title,
      imageUrl: candidate.imageUrl,
      ingredientIds: [],
      ingredientsRaw: candidate.ingredientsRaw ?? [],
      cookingTimeMinutes: candidate.cookingTimeMinutes ?? null,
    }
    const { error } = await createRecipe(input)
    if (error) {
      console.error('[onboarding/complete] createRecipe error:', error)
    }
  }

  const supabase = createServerClient()

  // onboarding_completed_at を更新
  const { error: updateError } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('line_user_id', lineUserId)

  if (updateError) {
    console.error('[onboarding/complete] Update user error:', updateError)
  }

  // onboarding_sessions を削除（一時データ破棄）
  await supabase
    .from('onboarding_sessions')
    .delete()
    .eq('user_id', lineUserId)

  return NextResponse.json({ success: true })
}
