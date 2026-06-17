import type { Metadata } from 'next'
import {
  HeroSection,
  FeaturesSection,
  ScreenshotSection,
  FAQSection,
  CTASection,
  LPFooter,
} from '@/components/features/lp'

export const metadata: Metadata = {
  title: 'RecipeHub - お気に入りレシピを食材で検索',
  description:
    'SNSやWebで見つけたレシピをURLで保存。食材を自動でタグ付けして、冷蔵庫の中身から検索できる自分専用のレシピ図鑑。',
  openGraph: {
    title: 'RecipeHub - お気に入りレシピを食材で検索',
    description:
      'SNSやWebで見つけたレシピをURLで保存。食材を自動でタグ付けして、冷蔵庫の中身から検索できる自分専用のレシピ図鑑。',
    type: 'website',
    images: ['/og-image.jpg'],
  },
}

const LINE_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_FRIEND_URL || '#'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection lineFriendUrl={LINE_FRIEND_URL} />
      <FeaturesSection />
      <ScreenshotSection />
      <FAQSection />
      <CTASection lineFriendUrl={LINE_FRIEND_URL} />
      <LPFooter />
    </div>
  )
}
