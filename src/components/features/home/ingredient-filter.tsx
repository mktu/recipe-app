'use client'

import { useState, useCallback } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useIngredients } from '@/hooks/use-ingredients'
import { IngredientCategoryList } from './ingredient-category-list'

interface IngredientFilterProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function IngredientFilter({ selectedIds, onSelectionChange }: IngredientFilterProps) {
  const [open, setOpen] = useState(false)
  const { ingredientsByCategory, isLoading } = useIngredients()

  const toggleIngredient = useCallback(
    (id: string) => {
      const newIds = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
      onSelectionChange(newIds)
    },
    [selectedIds, onSelectionChange]
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          食材で絞り込む
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
              {selectedIds.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            食材で絞り込む
            {selectedIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => onSelectionChange([])}>
                クリア
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto pb-safe">
          <IngredientCategoryList
            categories={ingredientsByCategory}
            selectedIds={selectedIds}
            onToggle={toggleIngredient}
            isLoading={isLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
