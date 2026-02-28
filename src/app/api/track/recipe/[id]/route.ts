import { NextRequest, NextResponse, after } from 'next/server'
import { createServerClient } from '@/lib/db/client'
import { recordRecipeView } from '@/lib/db/queries/recipes'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/track/recipe/[id]
 * LINE用: 閲覧を記録して元サイトURLにリダイレクト
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  // open redirect 防止: DBからURLを取得
  const supabase = createServerClient()
  const { data: recipe } = await supabase.from('recipes').select('url').eq('id', id).single()

  if (!recipe?.url) {
    return NextResponse.json({ error: 'レシピが見つかりません' }, { status: 404 })
  }

  // レスポンス後に関数を生存させてバックグラウンド実行
  after(() => recordRecipeView(id).catch(console.error))

  return NextResponse.redirect(recipe.url, 302)
}

/**
 * POST /api/track/recipe/[id]
 * LIFF用: 閲覧を記録して 204 を返す
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  await recordRecipeView(id)

  return new NextResponse(null, { status: 204 })
}
