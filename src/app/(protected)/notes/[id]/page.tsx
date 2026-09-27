import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'
import { LINE_VIEW_PARAM, LINE_VIEW_VALUE } from '@/lib/line/track-redirect'
import { RecipeNotePage } from '@/components/features/recipe-note/recipe-note-page'

interface NotePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NotePage({ params, searchParams }: NotePageProps) {
  const { id } = await params
  // LINE のカードは LIFF URL に `?from=line` を付けて直接開く（`toRecipeCardUrl`）
  const fromLine = (await searchParams)[LINE_VIEW_PARAM] === LINE_VIEW_VALUE

  // 材料名のサジェスト用。ノート本体は認証が要るのでクライアントで取る（ホーム・詳細と同じ）
  const { data: categories } = await fetchIngredientsByCategory()
  const ingredients = categories.flatMap((c) => c.ingredients.map(({ id, name }) => ({ id, name })))

  return <RecipeNotePage noteId={id} ingredients={ingredients} fromLine={fromLine} />
}
