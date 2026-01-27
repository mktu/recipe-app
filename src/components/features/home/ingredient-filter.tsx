'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useIngredientFilter } from '@/hooks/use-ingredient-filter'
import { IngredientFilterContent } from './ingredient-filter-content'
import type { IngredientsByCategory } from '@/types/recipe'

interface IngredientFilterProps {
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function IngredientFilter({ categories, selectedIds, onSelectionChange }: IngredientFilterProps) {
  const [open, setOpen] = useState(false)
  const filter = useIngredientFilter({ categories, selectedIds, onSelectionChange })

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
          <SheetTitle>食材で絞り込む</SheetTitle>
        </SheetHeader>
        <IngredientFilterContent
          searchQuery={filter.searchQuery}
          onSearchChange={filter.setSearchQuery}
          selectedIngredients={filter.selectedIngredients}
          selectedIds={filter.selectedIds}
          filteredIngredients={filter.filteredIngredients}
          validHistory={filter.validHistory}
          categories={categories}
          onToggle={filter.toggleIngredient}
          onClear={filter.clearSelection}
        />
      </SheetContent>
    </Sheet>
  )
}
