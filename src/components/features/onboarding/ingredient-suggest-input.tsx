'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

export function IngredientSuggestInput({ value, onChange, placeholder }: IngredientSuggestInputProps) {
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestions = useSuggestIngredients(query, value)
  const showDropdown = dropdownOpen && suggestions.length > 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function addItem(name: string) {
    const trimmed = name.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setQuery('')
    setDropdownOpen(false)
  }

  function removeItem(name: string) {
    onChange(value.filter((v) => v !== name))
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setDropdownOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      addItem(query)
    }
    if (e.key === 'Backspace' && !query && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1 rounded-md border border-input bg-background p-2 min-h-10 focus-within:ring-1 focus-within:ring-ring">
        {value.map((name) => (
          <Badge key={name} variant="secondary" className="gap-1 py-0.5">
            {name}
            <button type="button" onClick={() => removeItem(name)} className="ml-0.5 rounded-full hover:bg-muted">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          className="h-auto flex-1 min-w-24 border-0 p-0 shadow-none focus-visible:ring-0"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
      {showDropdown && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-input bg-background shadow-md">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); addItem(s.name) }}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
