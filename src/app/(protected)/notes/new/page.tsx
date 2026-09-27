import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { NewRecipeNotePage } from '@/components/features/recipe-note/new-recipe-note-page'

// 動的セグメントが無いので、放っておくとビルド時に静的化され、食材マスタの候補がビルド時点で固まる
// （ビルド環境から DB に届かなければ空のまま）。/notes/[id] と同じくリクエストごとに取る
export const dynamic = 'force-dynamic'

export default async function NewNotePage() {
  // 材料名のサジェスト用（/notes/[id] と同じ）
  const { data: categories } = await fetchIngredientsByCategory()
  const ingredients = categories.flatMap((c) => c.ingredients.map(({ id, name }) => ({ id, name })))

  return <NewRecipeNotePage ingredients={ingredients} />
}
