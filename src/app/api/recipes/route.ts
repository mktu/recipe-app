import { createRecipe } from '@/lib/db/queries/recipes'
import type { CreateRecipeInput } from '@/types/recipe'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/recipes
 * 新規レシピを作成
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateRecipeInput

  // バリデーション
  if (!body.lineUserId) {
    return NextResponse.json({ error: 'lineUserId は必須です' }, { status: 400 })
  }
  if (!body.url) {
    return NextResponse.json({ error: 'URL は必須です' }, { status: 400 })
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  }

  // レシピ作成
  const { data, error } = await createRecipe(body)

  if (error) {
    // UNIQUE制約違反（重複URL）
    if ('code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'このURLは既に登録済みです' }, { status: 409 })
    }
    console.error('[POST /api/recipes] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
