import { AuthWrapper } from '@/components/providers/auth-wrapper'
import { OnboardingGuard } from '@/components/providers/onboarding-guard'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthWrapper>
      <OnboardingGuard>{children}</OnboardingGuard>
    </AuthWrapper>
  )
}
