'use client'

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'ingredient-history'
const MAX_HISTORY = 10

interface IngredientHistoryItem {
  id: string
  name: string
}

interface UseIngredientHistoryReturn {
  history: IngredientHistoryItem[]
  addToHistory: (item: IngredientHistoryItem) => void
  clearHistory: () => void
}

function getInitialHistory(): IngredientHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function useIngredientHistory(): UseIngredientHistoryReturn {
  const [history, setHistory] = useState<IngredientHistoryItem[]>(getInitialHistory)

  // 履歴に追加
  const addToHistory = useCallback((item: IngredientHistoryItem) => {
    setHistory((prev) => {
      // 重複を除去して先頭に追加
      const filtered = prev.filter((h) => h.id !== item.id)
      const newHistory = [item, ...filtered].slice(0, MAX_HISTORY)

      // localStorage に保存
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
      } catch {
        // 保存失敗は無視
      }

      return newHistory
    })
  }, [])

  // 履歴をクリア
  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // 削除失敗は無視
    }
  }, [])

  return { history, addToHistory, clearHistory }
}
