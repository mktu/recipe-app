import { NextRequest, NextResponse } from 'next/server'
import { fetchRecipeById, deleteRecipe, updateRecipe } from '@/lib/db/queries/recipes'
import { apiServerError } from '@/lib/api/error-response'
import { requireLineUser } from '@/lib/api/auth-guard'
import type { UpdateRecipeInput } from '@/types/recipe'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/recipes/[id]
 * レシピ詳細を取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth
  const lineUserId = auth

  const { data, error } = await fetchRecipeById(lineUserId, id)

  if (error) {
    return apiServerError(error, 'GET /api/recipes/[id]')
  }

  if (!data) {
    return NextResponse.json({ error: 'レシピが見つかりません' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/recipes/[id]
 * レシピを削除
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth
  const lineUserId = auth

  const { error } = await deleteRecipe(lineUserId, id)

  if (error) {
    return apiServerError(error, 'DELETE /api/recipes/[id]')
  }

  return NextResponse.json({ success: true })
}

/**
 * PATCH /api/recipes/[id]
 * レシピを部分更新（現在はメモのみ対応）
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth
  const lineUserId = auth

  const body = await request.json()

  const updates: UpdateRecipeInput = {}
  if (body.ingredientIds) updates.ingredientIds = body.ingredientIds
  if (body.ingredientsRaw) updates.ingredientsRaw = body.ingredientsRaw
  if (typeof body.memo === 'string') updates.memo = body.memo

  const { error } = await updateRecipe(lineUserId, id, updates)
  if (error) {
    return apiServerError(error, 'PATCH /api/recipes/[id]')
  }

  return NextResponse.json({ success: true })
}
