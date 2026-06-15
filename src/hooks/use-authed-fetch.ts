'use client'

import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { authedFetch } from '@/lib/api/authed-fetch'

/**
 * 現在の LINE ID トークンを `Authorization: Bearer` ヘッダに付与する fetch を返すフック。
 *
 * @example
 * ```ts
 * const fetchWithAuth = useAuthedFetch()
 * const res = await fetchWithAuth('/api/recipes/list', { method: 'POST', body })
 * ```
 */
export function useAuthedFetch() {
  const { getIdToken } = useAuth()
  return useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => authedFetch(getIdToken(), input, init),
    [getIdToken]
  )
}
