'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IngredientRaw } from '@/types/recipe'

interface RecipeIngredientsProps {
  ingredients: IngredientRaw[]
  /** 材料が空のときの案内。ノートは再取得できないので、既定の文言を差し替える */
  emptyMessage?: string
}

const DEFAULT_EMPTY_MESSAGE = '材料情報がありません。「レシピ情報を再取得」をお試しください。'

export function RecipeIngredients({ ingredients, emptyMessage = DEFAULT_EMPTY_MESSAGE }: RecipeIngredientsProps) {
  if (ingredients.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">材料</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
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
