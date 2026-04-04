import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { createServerClient } from '@/lib/db/client'
import { NextRequest, NextResponse } from 'next/server'

interface ParseRecipeRequest {
  url: string
  lineUserId: string
}

/**
 * POST /api/recipes/parse
 * URLからレシピ情報を解析する
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as ParseRecipeRequest
  const { url, lineUserId } = body

  if (!lineUserId) {
    return NextResponse.json({ error: 'lineUserId は必須です' }, { status: 400 })
  }

  if (!url) {
    return NextResponse.json({ error: 'URL は必須です' }, { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: '無効なURL形式です' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: user } = await supabase.from('users').select('id').eq('line_user_id', lineUserId).single()
  if (!user) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  const result = await parseRecipe(url)
  return NextResponse.json(result)
}
