'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const SOURCE_NAME_OTHER = '_other'
const SOURCE_NAME_OTHER_LABEL = 'その他'

interface SelectedSourcesProps {
  sources: string[]
  onRemove: (name: string) => void
}

export function SelectedSources({ sources, onRemove }: SelectedSourcesProps) {
  if (sources.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((name) => (
        <Badge
          key={name}
          variant="secondary"
          className="cursor-pointer gap-1"
          onClick={() => onRemove(name)}
        >
          {name === SOURCE_NAME_OTHER ? SOURCE_NAME_OTHER_LABEL : name}
          <X className="h-3 w-3" />
        </Badge>
      ))}
    </div>
  )
}
