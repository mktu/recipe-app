'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IngredientRaw } from '@/types/recipe'

interface RecipeIngredientsProps {
  ingredients: IngredientRaw[]
}

export function RecipeIngredients({ ingredients }: RecipeIngredientsProps) {
  if (ingredients.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">材料</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ingredients.map((ing, index) => (
            <li key={index} className="flex justify-between border-b border-border/50 pb-2 last:border-0">
              <span>{ing.name}</span>
              <span className="text-muted-foreground">{ing.amount}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
