'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { RecipeDeleteButton } from './recipe-delete-button'

interface RecipeActionsProps {
  recipeId: string
  url: string
  isRescraping: boolean
  onRescrape: () => void
}

/**
 * ブックマーク（外部サイトのレシピ）の操作。
 * マイレシピはこの画面に来ずノート画面へ転送されるので、ここでは出し分けない（#226）。
 */
export function RecipeActions({ recipeId, url, isRescraping, onRescrape }: RecipeActionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <RescrapeButton isRescraping={isRescraping} onRescrape={onRescrape} />
      <Button variant="outline" className="w-full" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />レシピサイトに移動</a>
      </Button>
      <RecipeDeleteButton recipeId={recipeId} label="レシピ" />
    </div>
  )
}

function RescrapeButton({ isRescraping, onRescrape }: { isRescraping: boolean; onRescrape: () => void }) {
  return (
    <Button variant="outline" className="w-full" onClick={onRescrape} disabled={isRescraping}>
      {isRescraping ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />取得中...</>
      ) : (
        <><RefreshCw className="mr-2 h-4 w-4" />レシピ情報を再取得</>
      )}
    </Button>
  )
}
