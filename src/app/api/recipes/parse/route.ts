import type { ParsedRecipe } from '@/types/recipe'
import { NextRequest, NextResponse } from 'next/server'

interface ParseRecipeRequest {
  url: string
}

/**
 * URLからドメイン名を抽出
 */
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    // www. を除去してドメイン名を取得
    const domain = hostname.replace(/^www\./, '')
    // ドメインの最初の部分を取得（例: cookpad.com → cookpad）
    const name = domain.split('.')[0]
    // 先頭を大文字に
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return ''
  }
}

/**
 * POST /api/recipes/parse
 * URLからレシピ情報を解析する（現在はスタブ実装）
 *
 * 将来の実装:
 * 1. Jina Reader でURLからコンテンツ取得
 * 2. Gemini で構造化データ抽出
 * 3. 食材名を ingredient_aliases で正規化
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as ParseRecipeRequest
  const { url } = body

  if (!url) {
    return NextResponse.json({ error: 'URL は必須です' }, { status: 400 })
  }

  // URLの形式チェック
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: '無効なURL形式です' }, { status: 400 })
  }

  // スタブ実装: 空データを返す（sourceNameのみURLから抽出）
  const result: ParsedRecipe = {
    title: '',
    sourceName: extractDomainName(url),
    imageUrl: '',
    ingredientIds: [],
    memo: '',
  }

  return NextResponse.json(result)
}
