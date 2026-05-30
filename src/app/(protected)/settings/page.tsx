import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AccountDeleteSection } from '@/components/features/settings/account-delete-section'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex max-w-2xl items-center p-4">
          <Link href="/" className="mr-3 flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">設定</h1>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl space-y-6 p-4">
        <AccountDeleteSection />
      </main>
    </div>
  )
}
