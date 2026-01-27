'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { IngredientsByCategory } from '@/types/recipe'

interface ToggleableIngredient {
  id: string
  name: string
}

interface CategoryAccordionSectionProps {
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onToggle: (ing: ToggleableIngredient) => void
}

export function CategoryAccordionSection({
  categories,
  selectedIds,
  onToggle,
}: CategoryAccordionSectionProps) {
  const selectedSet = new Set(selectedIds)

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="categories" className="border-none">
        <AccordionTrigger className="py-2 text-sm font-medium text-muted-foreground hover:no-underline">
          カテゴリから選ぶ
        </AccordionTrigger>
        <AccordionContent>
          <Accordion type="multiple" className="w-full">
            {categories.map((cat) => (
              <AccordionItem key={cat.category} value={cat.category} className="border-b-0">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  {cat.category}
                  <span className="ml-1 text-xs text-muted-foreground">({cat.ingredients.length})</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 pb-2">
                    {cat.ingredients.map((ing) => {
                      const isSelected = selectedSet.has(ing.id)
                      return (
                        <Badge
                          key={ing.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => onToggle({ id: ing.id, name: ing.name })}
                        >
                          {ing.name}
                          {isSelected && <X className="ml-1 h-3 w-3" />}
                        </Badge>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
