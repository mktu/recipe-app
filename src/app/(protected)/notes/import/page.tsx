import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { ImportRecipeNotePage } from '@/components/features/recipe-note/import-recipe-note-page'

// /notes/new と同じく、食材マスタの候補をビルド時点で固めないようリクエストごとに取る
export const dynamic = 'force-dynamic'

export default async function ImportNotePage() {
  // 材料名のサジェスト用（/notes/new と同じ）
  const { data: categories } = await fetchIngredientsByCategory()
  const ingredients = categories.flatMap((c) => c.ingredients.map(({ id, name }) => ({ id, name })))

  return <ImportRecipeNotePage ingredients={ingredients} />
}
