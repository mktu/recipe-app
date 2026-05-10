'use client'

import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { IngredientsByCategory } from '@/types/recipe'

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
  categories,
  onToggle,
  onClear,
}: IngredientFilterContentProps) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-4 pb-4">
      <SearchInput value={searchQuery} onChange={onSearchChange} />
      {selectedIngredients.length > 0 && (
        <SelectedSection ingredients={selectedIngredients} onToggle={onToggle} onClear={onClear} />
      )}
      <div className="flex-1 overflow-hidden">
        {searchQuery ? (
          <SearchResults query={searchQuery} ingredients={filteredIngredients} onToggle={onToggle} />
        ) : (
          <CategoryTabsSection categories={categories} selectedIds={selectedIds} onToggle={onToggle} />
        )}
      </div>
    </div>
  )
}

function ChipButton({ name, selected, onToggle }: { name: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background hover:bg-muted'
      }`}
    >
      {name}
    </button>
  )
}

function CategoryTabsSection({
  categories,
  selectedIds,
  onToggle,
}: {
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onToggle: (ing: ToggleableIngredient) => void
}) {
  if (categories.length === 0) return null
  const selectedSet = new Set(selectedIds)

  return (
    <Tabs defaultValue={categories[0].category} className="flex h-full flex-col overflow-hidden">
      <TabsList className="h-auto w-full shrink-0 justify-start gap-6 overflow-x-auto overflow-y-hidden rounded-none border-b bg-transparent p-0">
        {categories.map((cat) => (
          <TabsTrigger
            key={cat.category}
            value={cat.category}
            className="h-auto flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2 text-sm transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none"
          >
            {cat.category}
          </TabsTrigger>
        ))}
      </TabsList>
      {categories.map((cat) => (
        <TabsContent key={cat.category} value={cat.category} className="mt-3 flex-1 overflow-y-auto">
          <div className="flex flex-wrap content-start gap-2">
            {cat.ingredients.map((ing) => (
              <ChipButton
                key={ing.id}
                name={ing.name}
                selected={selectedSet.has(ing.id)}
                onToggle={() => onToggle({ id: ing.id, name: ing.name })}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}

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
      <p className="mt-4 text-center text-sm text-muted-foreground">
        「{query}」に一致する食材がありません
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-2 overflow-y-auto">
      {ingredients.map((ing) => (
        <ChipButton key={ing.id} name={ing.name} selected={false} onToggle={() => onToggle(ing)} />
      ))}
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
        <span className="text-sm font-medium text-muted-foreground">選択中 ({ingredients.length})</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
          クリア
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {ingredients.map((ing) => (
          <Badge key={ing.id} variant="default" className="cursor-pointer" onClick={() => onToggle(ing)}>
            {ing.name}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        ))}
      </div>
    </div>
  )
}
