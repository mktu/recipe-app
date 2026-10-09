import { createRecipeNote, type RecipeNoteError, type RecipeNoteResult } from '@/lib/db/queries/recipe-notes'
import { resolveIngredients } from '@/lib/recipe/match-ingredients'
import type { RecipeNoteFields } from '@/types/recipe'

/**
 * レシピノートを作成する（Web の POST /api/notes と LINE の Markdown 登録 #208 で共通）
 *
 * 材料の食材 ID は呼び出し元から受け取らず、ここで材料名から解決する。
 * 未マッチの記録も `create_recipe_note` の同じトランザクションに入る。
 * 入力の検証は呼び出し元の責務（Web は `parseNoteFields`、LINE は `parseRecipeMarkdown` の `registrable`）。
 */
export async function saveRecipeNote(
  lineUserId: string,
  fields: RecipeNoteFields
): Promise<{ data: RecipeNoteResult | null; error: RecipeNoteError | null }> {
  const { matched, unmatched } = await resolveIngredients(fields.ingredients.map((i) => i.name))
  return createRecipeNote({
    ...fields,
    lineUserId,
    ingredientIds: matched.map((m) => m.ingredientId),
    unmatchedIngredients: unmatched,
  })
}
