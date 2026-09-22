'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const SOURCE_NAME_OTHER = '_other'
const SOURCE_NAME_OTHER_LABEL = 'その他'

interface SelectedSourcesProps {
  sources: string[]
  onRemove: (name: string) => void
}

/** 選択中のサイトチップ。`SelectedIngredients` と同じ理由でネイティブの button にしている（#38） */
export function SelectedSources({ sources, onRemove }: SelectedSourcesProps) {
  if (sources.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((name) => {
        const label = name === SOURCE_NAME_OTHER ? SOURCE_NAME_OTHER_LABEL : name
        return (
          <Badge key={name} variant="secondary" className="cursor-pointer gap-1" asChild>
            <button type="button" onClick={() => onRemove(name)} aria-label={`${label} を絞り込みから外す`}>
              {label}
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}
    </div>
  )
}
