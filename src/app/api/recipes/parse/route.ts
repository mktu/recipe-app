import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { NextRequest, NextResponse } from 'next/server'

interface ParseRecipeRequest {
  url: string
}

/**
 * POST /api/recipes/parse
 * URLからレシピ情報を解析する
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as ParseRecipeRequest
  const { url } = body

  if (!url) {
    return NextResponse.json({ error: 'URL は必須です' }, { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: '無効なURL形式です' }, { status: 400 })
  }

  const result = await parseRecipe(url)
  return NextResponse.json(result)
}
