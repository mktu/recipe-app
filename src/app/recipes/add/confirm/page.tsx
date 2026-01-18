import { Suspense } from 'react'
import { ConfirmPage } from '@/components/features/add-recipe/confirm-page'

export default function ConfirmRecipePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      }
    >
      <ConfirmPage />
    </Suspense>
  )
}
