'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { PopularIngredient } from '@/lib/db/queries/ingredients'

const CATEGORY_ORDER = ['肉', '魚介', '野菜', 'きのこ', '卵・乳製品', '豆腐・大豆製品', '穀物・麺類']

function CategoryChipGroup({
  category, ingredients, selected, onToggle,
}: {
  category: string
  ingredients: PopularIngredient[]
  selected: string[]
  onToggle: (name: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{category}</p>
      <div className="flex flex-wrap gap-1.5">
        {ingredients.map((ing) => {
          const isSelected = selected.includes(ing.name)
          return (
            <button
              key={ing.id}
              type="button"
              onClick={() => onToggle(ing.name)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {ing.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FreeTextInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  function addFreeText() {
    const trimmed = input.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      addFreeText()
    }
  }

  return (
    <Input
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
      placeholder="リストにないものを入力して Enter…"
    />
  )
}

function SelectedBadgeList({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
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

interface IngredientChipSelectorProps {
  popularIngredients: PopularIngredient[]
  value: string[]
  onChange: (value: string[]) => void
}

export function IngredientChipSelector({ popularIngredients, value, onChange }: IngredientChipSelectorProps) {
  const byCategory = CATEGORY_ORDER.reduce<Record<string, PopularIngredient[]>>((acc, cat) => {
    const items = popularIngredients.filter((i) => i.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name])
  }

  return (
    <div className="space-y-3">
      {Object.entries(byCategory).map(([cat, items]) => (
        <CategoryChipGroup
          key={cat}
          category={cat}
          ingredients={items}
          selected={value}
          onToggle={toggle}
        />
      ))}
      <FreeTextInput value={value} onChange={onChange} />
      <SelectedBadgeList value={value} onChange={onChange} />
    </div>
  )
}
