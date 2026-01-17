'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AddRecipeFABProps {
  onClick: () => void
}

export function AddRecipeFAB({ onClick }: AddRecipeFABProps) {
  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg safe-bottom"
      onClick={onClick}
      aria-label="レシピを追加"
    >
      <Plus className="h-6 w-6" />
    </Button>
  )
}
