import { PreferencesForm } from '@/components/features/onboarding/preferences-form'
import { fetchPopularIngredientsForOnboarding } from '@/lib/db/queries/ingredients'

export default async function OnboardingPage() {
  const popularIngredients = await fetchPopularIngredientsForOnboarding()
  return <PreferencesForm popularIngredients={popularIngredients} />
}
