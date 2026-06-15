import { createRecipe } from '@/lib/db/queries/recipes'
import { apiServerError } from '@/lib/api/error-response'
import { requireLineUser } from '@/lib/api/auth-guard'
import type { CreateRecipeInput } from '@/types/recipe'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/recipes
 * 新規レシピを作成
 */
export async function POST(request: NextRequest) {
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth
  const lineUserId = auth

  const body = (await request.json()) as CreateRecipeInput

  // バリデーション
  if (!body.url) {
    return NextResponse.json({ error: 'URL は必須です' }, { status: 400 })
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  }

  // 検証済みの lineUserId で上書き（body の自己申告値は信用しない）
  const { data, error } = await createRecipe({ ...body, lineUserId })

  if (error) {
    // UNIQUE制約違反（重複URL）
    if ('code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'このURLは既に登録済みです' }, { status: 409 })
    }
    return apiServerError(error, 'POST /api/recipes')
  }

  return NextResponse.json(data)
}
