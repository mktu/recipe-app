import { UrlInputPage } from '@/components/features/add-recipe/url-input-page'
import { urlInputErrorMessage } from '@/components/features/add-recipe/url-input-errors'

interface AddRecipePageProps {
  searchParams: Promise<{ url?: string; error?: string }>
}

export default async function AddRecipePage({ searchParams }: AddRecipePageProps) {
  const { url, error } = await searchParams
  return <UrlInputPage initialUrl={url ?? ''} initialError={urlInputErrorMessage(error)} />
}
