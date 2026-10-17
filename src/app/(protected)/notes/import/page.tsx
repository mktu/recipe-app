import { fetchIngredientOptions } from '@/lib/db/queries/ingredients'
import { ImportRecipeNotePage } from '@/components/features/recipe-note/import-recipe-note-page'

// /notes/new と同じく、食材マスタの候補をビルド時点で固めないようリクエストごとに取る
export const dynamic = 'force-dynamic'

export default async function ImportNotePage() {
  // 材料名のサジェスト用（/notes/new と同じ）
  const ingredients = await fetchIngredientOptions()

  return <ImportRecipeNotePage ingredients={ingredients} />
}
