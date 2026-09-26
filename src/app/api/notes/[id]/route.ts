import { NextRequest, NextResponse } from 'next/server'
import { fetchRecipeNoteById, updateRecipeNote, isNoteNotFoundError } from '@/lib/db/queries/recipe-notes'
import { resolveIngredients } from '@/lib/recipe/match-ingredients'
import { parseNoteFields } from '@/lib/recipe/note-fields'
import { apiServerError } from '@/lib/api/error-response'
import { requireLineUser } from '@/lib/api/auth-guard'

interface RouteContext {
  params: Promise<{ id: string }>
}

const NOT_FOUND = { error: 'ノートが見つかりません' }

/**
 * GET /api/notes/[id]
 * レシピノートを取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await fetchRecipeNoteById(auth, id)
  if (error) return apiServerError(error, 'GET /api/notes/[id]')
  if (!data) return NextResponse.json(NOT_FOUND, { status: 404 })

  return NextResponse.json(data)
}

/**
 * PUT /api/notes/[id]
 * レシピノートを全項目置き換えで更新し、図鑑のレシピ行へ書き戻す
 *
 * 材料の食材 ID はクライアントから受け取らず、ここで材料名から解決する。
 * 未マッチ食材の記録は RPC 側でレシピ行と同じトランザクションに入る。
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth

  const parsed = parseNoteFields(await request.json().catch(() => null))
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { matched, unmatched } = await resolveIngredients(parsed.data.ingredients.map((i) => i.name))
  const { error } = await updateRecipeNote({
    ...parsed.data,
    noteId: id,
    lineUserId: auth,
    ingredientIds: matched.map((m) => m.ingredientId),
    unmatchedIngredients: unmatched,
  })

  if (isNoteNotFoundError(error)) return NextResponse.json(NOT_FOUND, { status: 404 })
  if (error) return apiServerError(error, 'PUT /api/notes/[id]')

  return NextResponse.json({ success: true })
}
