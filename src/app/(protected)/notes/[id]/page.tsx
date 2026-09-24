import { RecipeNotePage } from '@/components/features/recipe-note/recipe-note-page'

interface NotePageProps {
  params: Promise<{ id: string }>
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params

  return <RecipeNotePage noteId={id} />
}
