'use client'

import type { RecipeFiltersState, RecipeFiltersActions } from '@/hooks/use-recipe-filters'
import { IngredientFilter } from './ingredient-filter'
import { SourceFilter } from './source-filter'
import { SelectedIngredients } from './selected-ingredients'
import { SelectedSources } from './selected-sources'
import type { IngredientsByCategory } from '@/types/recipe'

interface FilterBarProps {
  filters: RecipeFiltersState & RecipeFiltersActions
  ingredientCategories: IngredientsByCategory[]
  availableSourceNames: string[]
}

export function FilterBar({ filters, ingredientCategories, availableSourceNames }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <IngredientFilter
        categories={ingredientCategories}
        selectedIds={filters.selectedIngredientIds}
        onSelectionChange={filters.setSelectedIngredientIds}
      />
      <SourceFilter
        sourceNames={availableSourceNames}
        selectedSources={filters.selectedSourceNames}
        onToggle={filters.toggleSourceName}
      />
      <SelectedIngredients
        ids={filters.selectedIngredientIds}
        nameMap={filters.ingredientNameMap}
        onRemove={filters.removeIngredient}
      />
      <SelectedSources
        sources={filters.selectedSourceNames}
        onRemove={filters.removeSourceName}
      />
    </div>
  )
}
