import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { RecipeNotePage } from '@/components/features/recipe-note/recipe-note-page'

interface NotePageProps {
  params: Promise<{ id: string }>
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params

  // 材料名のサジェスト用。ノート本体は認証が要るのでクライアントで取る（ホーム・詳細と同じ）
  const { data: categories } = await fetchIngredientsByCategory()
  const ingredients = categories.flatMap((c) => c.ingredients.map(({ id, name }) => ({ id, name })))

  return <RecipeNotePage noteId={id} ingredients={ingredients} />
}
