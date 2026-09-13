import { NextRequest, NextResponse, after } from 'next/server'
import { createServerClient } from '@/lib/db/client'
import { recordRecipeView } from '@/lib/db/queries/recipes'
import { requireLineUser } from '@/lib/api/auth-guard'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/track/recipe/[id]
 * LINE用: 閲覧を記録して元サイトURLにリダイレクト
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  // open redirect 防止: DBからURLを取得
  const supabase = createServerClient()
  const { data: recipe } = await supabase.from('recipes').select('url').eq('id', id).single()

  if (!recipe?.url) {
    return NextResponse.json({ error: 'レシピが見つかりません' }, { status: 404 })
  }

  // レスポンス後に関数を生存させてバックグラウンド実行
  after(() => recordRecipeView(id).catch(console.error))

  // NextResponse.redirect は絶対 URL しか受け付けない（内部の validateURL が
  // ベース無しの new URL() に通すため相対パスは例外になる）。レシピノートの
  // url は相対パス /notes/<note_id> なので、リクエストのオリジンで解決する。
  // 外部サイトの絶対 URL はベースを無視して素通りする。
  return NextResponse.redirect(new URL(recipe.url, request.url), 302)
}

/**
 * POST /api/track/recipe/[id]
 * LIFF用: 閲覧を記録して 204 を返す
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params

  await recordRecipeView(id)

  return new NextResponse(null, { status: 204 })
}
