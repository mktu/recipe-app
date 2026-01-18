'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  onBack: () => void
}

export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex max-w-2xl items-center gap-3 p-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
    </header>
  )
}

export function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}

interface ErrorMessageProps {
  error: Error
  onRetry: () => void
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-destructive">{error.message}</p>
      <Button variant="outline" onClick={onRetry}>
        再試行
      </Button>
    </div>
  )
}
