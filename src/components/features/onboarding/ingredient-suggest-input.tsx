'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Command, CommandItem, CommandList } from '@/components/ui/command'
import { supabase } from '@/lib/db/client'

interface Ingredient {
  id: string
  name: string
}

interface IngredientSuggestInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

function useSuggestIngredients(query: string, selected: string[]) {
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase.from('ingredients').select('id, name')
      if (data) setAllIngredients(data as Ingredient[])
    }
    fetchAll()
  }, [])

  return useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const selectedSet = new Set(selected)
    return allIngredients
      .filter((i) => i.name.toLowerCase().includes(q) && !selectedSet.has(i.name))
      .slice(0, 8)
  }, [query, allIngredients, selected])
}

function useIngredientSuggestInput(value: string[], onChange: (value: string[]) => void) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const suggestions = useSuggestIngredients(query, value)
  const activeIndex = Math.min(highlightedIndex, suggestions.length - 1)
  const showDropdown = open && suggestions.length > 0

  function addFromSuggestion(name: string) {
    if (value.includes(name)) return
    onChange([...value, name])
    setQuery('')
    setOpen(false)
    setHighlightedIndex(0)
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(true)
    setHighlightedIndex(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      if (suggestions[activeIndex]) addFromSuggestion(suggestions[activeIndex].name)
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return {
    query, open, setOpen, isComposing, setIsComposing,
    activeIndex, suggestions, showDropdown, setHighlightedIndex,
    addFromSuggestion, handleQueryChange, handleKeyDown,
  }
}

function IngredientBadgeList({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  if (value.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((name) => (
        <Badge key={name} variant="secondary" className="gap-1 py-0.5">
          {name}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== name))}
            className="ml-0.5 rounded-full hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}

export function IngredientSuggestInput({ value, onChange, placeholder }: IngredientSuggestInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    query, setOpen, setIsComposing, activeIndex, suggestions,
    showDropdown, setHighlightedIndex, addFromSuggestion, handleQueryChange, handleKeyDown,
  } = useIngredientSuggestInput(value, onChange)

  return (
    <div className="space-y-1.5">
      <Popover open={showDropdown} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-(--radix-popover-anchor-width) p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command
            shouldFilter={false}
            value={suggestions[activeIndex]?.name ?? ''}
            onValueChange={() => {}}
          >
            <CommandList>
              {suggestions.map((s, i) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onMouseDown={(e) => { e.preventDefault(); addFromSuggestion(s.name) }}
                  className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground cursor-pointer"
                >
                  {s.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <IngredientBadgeList value={value} onChange={onChange} />
    </div>
  )
}
