'use client'

import { useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useIngredients } from '@/hooks/use-ingredients'
import { IngredientList } from './ingredient-list'

const MAX_INGREDIENTS = 5

interface IngredientSelectorProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function IngredientSelector({ selectedIds, onSelectionChange }: IngredientSelectorProps) {
  const [open, setOpen] = useState(false)
  const { ingredientsByCategory, isLoading } = useIngredients()

  const toggleIngredient = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((i) => i !== id))
      else if (selectedIds.length < MAX_INGREDIENTS) onSelectionChange([...selectedIds, id])
    },
    [selectedIds, onSelectionChange]
  )

  const getIngredientName = (id: string): string => {
    for (const group of ingredientsByCategory) {
      const found = group.ingredients.find((ing) => ing.id === id)
      if (found) return found.name
    }
    return ''
  }

  const isMaxReached = selectedIds.length >= MAX_INGREDIENTS

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.map((id) => (
          <Badge key={id} variant="secondary" className="gap-1 py-1">
            {getIngredientName(id)}
            <button type="button" onClick={() => onSelectionChange(selectedIds.filter((i) => i !== id))} className="ml-1 rounded-full hover:bg-muted">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1" disabled={isMaxReached}>
              <Plus className="h-4 w-4" />
              追加
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>メイン食材を選択（{selectedIds.length}/{MAX_INGREDIENTS}）</SheetTitle>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto px-4 pb-4">
              <IngredientList categories={ingredientsByCategory} selectedIds={selectedIds} onToggle={toggleIngredient} isLoading={isLoading} isMaxReached={isMaxReached} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {isMaxReached && <p className="text-xs text-muted-foreground">最大{MAX_INGREDIENTS}つまで選択できます</p>}
    </div>
  )
}
