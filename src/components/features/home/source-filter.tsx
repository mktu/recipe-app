'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const SOURCE_NAME_OTHER = '_other'
const SOURCE_NAME_OTHER_LABEL = 'その他'

function getSourceLabel(name: string): string {
  return name === SOURCE_NAME_OTHER ? SOURCE_NAME_OTHER_LABEL : name
}

interface SourceFilterProps {
  sourceNames: string[]
  selectedSources: string[]
  onToggle: (name: string) => void
}

export function SourceFilter({ sourceNames, selectedSources, onToggle }: SourceFilterProps) {
  const [open, setOpen] = useState(false)

  if (sourceNames.length === 0) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="h-4 w-4" />
          サイトで絞り込む
          {selectedSources.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
              {selectedSources.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[50vh]">
        <SheetHeader>
          <SheetTitle>サイトで絞り込む</SheetTitle>
        </SheetHeader>
        <div className="space-y-1 overflow-y-auto px-4 pb-4">
          {sourceNames.map((name) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
            >
              <Checkbox
                checked={selectedSources.includes(name)}
                onCheckedChange={() => onToggle(name)}
              />
              <span className="text-sm">{getSourceLabel(name)}</span>
            </label>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
