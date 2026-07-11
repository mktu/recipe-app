'use client'

import { useCallback, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IngredientList } from './ingredient-list'
import { filterIngredientsByQuery } from '@/lib/recipe/search-ingredient'
import type { IngredientsByCategory } from '@/types/recipe'

interface IngredientPickerProps {
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onToggle: (id: string) => void
  isMaxReached: boolean
}

/**
 * メイン食材を「検索」または「カテゴリ」から選ぶピッカー
 * 検索欄に入力があれば部分一致の検索結果、空ならカテゴリ一覧を表示する
 */
export function IngredientPicker({ categories, selectedIds, onToggle, isMaxReached }: IngredientPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const allIngredients = useMemo(() => categories.flatMap((cat) => cat.ingredients), [categories])
  const searchResults = useMemo(
    () => filterIngredientsByQuery(allIngredients, searchQuery),
    [allIngredients, searchQuery]
  )

  // 検索結果から新規に追加したら入力欄をクリアして次の食材を探しやすくする（選択解除時は維持）
  const handleSearchToggle = useCallback(
    (id: string) => {
      if (!selectedIds.includes(id)) setSearchQuery('')
      onToggle(id)
    },
    [selectedIds, onToggle]
  )

  return (
    <div className="space-y-4">
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      {searchQuery.trim() ? (
        <SearchResults
          query={searchQuery}
          ingredients={searchResults}
          selectedIds={selectedIds}
          onToggle={handleSearchToggle}
          isMaxReached={isMaxReached}
        />
      ) : (
        <IngredientList categories={categories} selectedIds={selectedIds} onToggle={onToggle} isMaxReached={isMaxReached} />
      )}
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder="食材を検索..." value={value} onChange={(e) => onChange(e.target.value)} className="pl-9" />
      {value && (
        <Button
          type="button"
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

interface SearchResultsProps {
  query: string
  ingredients: { id: string; name: string }[]
  selectedIds: string[]
  onToggle: (id: string) => void
  isMaxReached: boolean
}

function SearchResults({ query, ingredients, selectedIds, onToggle, isMaxReached }: SearchResultsProps) {
  if (ingredients.length === 0) {
    return <p className="mt-4 text-center text-sm text-muted-foreground">「{query}」に一致する食材がありません</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ingredients.map((ing) => {
        const isSelected = selectedIds.includes(ing.id)
        const isDisabled = !isSelected && isMaxReached
        return (
          <Badge
            key={ing.id}
            variant={isSelected ? 'default' : 'outline'}
            className={`cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => !isDisabled && onToggle(ing.id)}
          >
            {ing.name}
            {isSelected && <X className="ml-1 h-3 w-3" />}
          </Badge>
        )
      })}
    </div>
  )
}
