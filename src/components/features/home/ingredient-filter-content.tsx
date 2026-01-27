'use client'

import { Clock, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { IngredientsByCategory } from '@/types/recipe'
import { CategoryAccordionSection } from './category-accordion-section'

interface ToggleableIngredient {
  id: string
  name: string
}

interface IngredientFilterContentProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedIngredients: ToggleableIngredient[]
  selectedIds: string[]
  filteredIngredients: ToggleableIngredient[]
  validHistory: ToggleableIngredient[]
  categories: IngredientsByCategory[]
  onToggle: (ingredient: ToggleableIngredient) => void
  onClear: () => void
}

export function IngredientFilterContent({
  searchQuery,
  onSearchChange,
  selectedIngredients,
  selectedIds,
  filteredIngredients,
  validHistory,
  categories,
  onToggle,
  onClear,
}: IngredientFilterContentProps) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden px-4 pt-4 pb-4">
      <SearchInput value={searchQuery} onChange={onSearchChange} />
      {selectedIngredients.length > 0 && (
        <SelectedSection ingredients={selectedIngredients} onToggle={onToggle} onClear={onClear} />
      )}
      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          <SearchResults query={searchQuery} ingredients={filteredIngredients} onToggle={onToggle} />
        ) : (
          <div className="space-y-4">
            <HistorySection history={validHistory} onToggle={onToggle} />
            <CategoryAccordionSection categories={categories} selectedIds={selectedIds} onToggle={onToggle} />
          </div>
        )}
      </div>
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder="食材を入力..." value={value} onChange={(e) => onChange(e.target.value)} className="pl-9" />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// 選択中セクション
function SelectedSection({
  ingredients,
  onToggle,
  onClear,
}: {
  ingredients: ToggleableIngredient[]
  onToggle: (ing: ToggleableIngredient) => void
  onClear: () => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          選択中 ({ingredients.length})
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
          クリア
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {ingredients.map((ing) => (
          <Badge
            key={ing.id}
            variant="default"
            className="cursor-pointer"
            onClick={() => onToggle(ing)}
          >
            {ing.name}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        ))}
      </div>
    </div>
  )
}

// 検索結果セクション
function SearchResults({
  query,
  ingredients,
  onToggle,
}: {
  query: string
  ingredients: ToggleableIngredient[]
  onToggle: (ing: ToggleableIngredient) => void
}) {
  if (ingredients.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        「{query}」に一致する食材がありません
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 overflow-y-auto">
      {ingredients.map((ing) => (
        <Badge
          key={ing.id}
          variant="outline"
          className="cursor-pointer"
          onClick={() => onToggle(ing)}
        >
          {ing.name}
        </Badge>
      ))}
    </div>
  )
}

// 履歴セクション
function HistorySection({
  history,
  onToggle,
}: {
  history: ToggleableIngredient[]
  onToggle: (ing: ToggleableIngredient) => void
}) {
  if (history.length === 0) return null

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        最近使った食材
      </h4>
      <div className="flex flex-wrap gap-2">
        {history.map((item) => (
          <Badge
            key={item.id}
            variant="outline"
            className="cursor-pointer"
            onClick={() => onToggle(item)}
          >
            {item.name}
          </Badge>
        ))}
      </div>
    </div>
  )
}

