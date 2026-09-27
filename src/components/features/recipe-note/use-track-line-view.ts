'use client'

import { useEffect, useRef } from 'react'
import { useAuthedFetch } from '@/hooks/use-authed-fetch'

/**
 * LINE のカードから開かれたノートの閲覧を記録する。
 *
 * ノートのカードは track ルートを挟まず LIFF URL を直接開くため（`toRecipeCardUrl`）、
 * サーバー側の GET では記録されない。代わりにここで LIFF 用の POST を1回だけ送る。
 * 記録先は対のレシピ行なので、`recipeId` が分かってから送る。
 */
export function useTrackLineView(enabled: boolean, recipeId: string | null | undefined) {
  const authedFetch = useAuthedFetch()
  const sent = useRef(false)

  useEffect(() => {
    if (!enabled || !recipeId || sent.current) return
    sent.current = true
    authedFetch(`/api/track/recipe/${recipeId}`, { method: 'POST' }).catch(() => {})
  }, [enabled, recipeId, authedFetch])
}
