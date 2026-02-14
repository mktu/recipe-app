import type { Metadata } from 'next'
import { LegalPageLayout, PrivacyContent } from '@/components/features/legal'

export const metadata: Metadata = {
  title: 'プライバシーポリシー - RecipeHub',
  description: 'RecipeHubのプライバシーポリシー',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="プライバシーポリシー" lastUpdated="2025年2月8日">
      <PrivacyContent />
    </LegalPageLayout>
  )
}
