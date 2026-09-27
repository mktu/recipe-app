import { NextRequest, NextResponse } from 'next/server'
import { createRecipeNote } from '@/lib/db/queries/recipe-notes'
import { resolveIngredients } from '@/lib/recipe/match-ingredients'
import { parseNoteFields } from '@/lib/recipe/note-fields'
import { apiServerError } from '@/lib/api/error-response'
import { requireLineUser } from '@/lib/api/auth-guard'

/**
 * POST /api/notes
 * レシピノートを作成し、図鑑のレシピ行を対で作る
 *
 * 材料の食材 ID はクライアントから受け取らず、ここで材料名から解決する（PUT /api/notes/[id] と同じ）。
 * 材料名と分量が分かれて届くので、スクレイピング経路と違い「なす 2本」ではなく「なす」で照合できる。
 */
export async function POST(request: NextRequest) {
  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth

  const parsed = parseNoteFields(await request.json().catch(() => null))
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { matched, unmatched } = await resolveIngredients(parsed.data.ingredients.map((i) => i.name))
  const { data, error } = await createRecipeNote({
    ...parsed.data,
    lineUserId: auth,
    ingredientIds: matched.map((m) => m.ingredientId),
    unmatchedIngredients: unmatched,
  })

  if (error || !data) return apiServerError(error, 'POST /api/notes')

  return NextResponse.json(data)
}
