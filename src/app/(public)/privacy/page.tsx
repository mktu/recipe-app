import type { Metadata } from 'next'
import { LegalPageLayout, PrivacyContent } from '@/components/features/legal'

export const metadata: Metadata = {
  title: 'プライバシーポリシー - RecipeHub',
  description: 'RecipeHubのプライバシーポリシー',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="プライバシーポリシー" lastUpdated="2026年9月27日">
      <PrivacyContent />
    </LegalPageLayout>
  )
}
