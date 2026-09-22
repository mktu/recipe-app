'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SelectedIngredientsProps {
  ids: string[]
  nameMap: Map<string, string>
  onRemove: (id: string) => void
}

/**
 * 選択中の食材チップ。押すと絞り込みから外れる。
 *
 * `asChild` で中身を `<button>` にしている。以前は `onClick` 付きの `span` で、
 * キーボードから外せず `getByRole` でも取れなかった（#38）。
 */
export function SelectedIngredients({ ids, nameMap, onRemove }: SelectedIngredientsProps) {
  if (ids.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const name = nameMap.get(id) || id
        return (
          <Badge key={id} variant="secondary" className="cursor-pointer gap-1" asChild>
            <button type="button" onClick={() => onRemove(id)} aria-label={`${name} を絞り込みから外す`}>
              {name}
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}
    </div>
  )
}
