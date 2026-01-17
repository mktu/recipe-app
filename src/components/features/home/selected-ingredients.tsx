'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SelectedIngredientsProps {
  ids: string[]
  nameMap: Map<string, string>
  onRemove: (id: string) => void
}

export function SelectedIngredients({ ids, nameMap, onRemove }: SelectedIngredientsProps) {
  if (ids.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <Badge
          key={id}
          variant="secondary"
          className="cursor-pointer gap-1"
          onClick={() => onRemove(id)}
        >
          {nameMap.get(id) || id}
          <X className="h-3 w-3" />
        </Badge>
      ))}
    </div>
  )
}
