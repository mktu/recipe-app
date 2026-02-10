import type { Metadata } from 'next'
import { LegalPageLayout, TermsContent } from '@/components/features/legal'

export const metadata: Metadata = {
  title: '利用規約 - RecipeHub',
  description: 'RecipeHubの利用規約',
}

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="利用規約" lastUpdated="2025年2月8日">
      <TermsContent />
    </LegalPageLayout>
  )
}
