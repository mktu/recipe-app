import { NextRequest, NextResponse } from 'next/server'
import { fetchRecipeById, deleteRecipe, updateRecipeMemo, recordRecipeView } from '@/lib/db/queries/recipes'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/recipes/[id]
 * レシピ詳細を取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const lineUserId = request.headers.get('x-line-user-id')

  if (!lineUserId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await fetchRecipeById(lineUserId, id)

  if (error) {
    console.error('[GET /api/recipes/[id]] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'レシピが見つかりません' }, { status: 404 })
  }

  // 閲覧数を記録（非同期で実行、エラーは無視）
  recordRecipeView(id).catch(console.error)

  return NextResponse.json(data)
}

/**
 * DELETE /api/recipes/[id]
 * レシピを削除
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const lineUserId = request.headers.get('x-line-user-id')

  if (!lineUserId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { error } = await deleteRecipe(lineUserId, id)

  if (error) {
    console.error('[DELETE /api/recipes/[id]] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/**
 * PATCH /api/recipes/[id]
 * レシピを部分更新（現在はメモのみ対応）
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const lineUserId = request.headers.get('x-line-user-id')

  if (!lineUserId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await request.json()

  // メモの更新
  if (typeof body.memo === 'string') {
    const { error } = await updateRecipeMemo(lineUserId, id, body.memo)

    if (error) {
      console.error('[PATCH /api/recipes/[id]] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
