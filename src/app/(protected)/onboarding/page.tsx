import { PreferencesForm } from '@/components/features/onboarding/preferences-form'
import { fetchPopularIngredientsForOnboarding } from '@/lib/db/queries/ingredients'

export const revalidate = 3600

export default async function OnboardingPage() {
  const popularIngredients = await fetchPopularIngredientsForOnboarding(10)
  return <PreferencesForm popularIngredients={popularIngredients} />
}
