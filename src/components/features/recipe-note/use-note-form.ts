'use client'

import { useCallback, useState } from 'react'
import { isPlaceholderImageKey, type PlaceholderImageKey } from '@/lib/recipe/placeholder-images'
import type { RecipeNoteDetail, RecipeNoteFields } from '@/types/recipe'

/** 行を並べ替え・削除しても入力欄の状態が別の行に移らないよう、index ではなく key で識別する */
export interface IngredientRow { key: number; name: string; amount: string }
export interface StepRow { key: number; text: string }

let nextKey = 0
const newKey = () => nextKey++

export const emptyIngredient = (): IngredientRow => ({ key: newKey(), name: '', amount: '' })
export const emptyStep = (): StepRow => ({ key: newKey(), text: '' })

function initialRows<T, R>(items: T[], toRow: (item: T) => R, empty: () => R): R[] {
  return items.length > 0 ? items.map(toRow) : [empty()]
}

/** 調理時間の入力欄の値を API の値に変換する。空欄は null、解釈できなければ undefined */
function parseCookingTime(value: string): number | null | undefined {
  if (!value.trim()) return null
  const minutes = Number(value)
  return Number.isInteger(minutes) && minutes > 0 ? minutes : undefined
}

export function useNoteForm(note: RecipeNoteDetail) {
  const [title, setTitle] = useState(note.title)
  const [servings, setServings] = useState(note.servings ?? '')
  const [cookingTime, setCookingTime] = useState(note.cookingTimeMinutes?.toString() ?? '')
  const [imageKey, setImageKey] = useState<PlaceholderImageKey | null>(
    isPlaceholderImageKey(note.imageKey) ? note.imageKey : null
  )
  const [memo, setMemo] = useState(note.memo ?? '')
  const [ingredients, setIngredients] = useState(() =>
    initialRows(note.ingredients, (i) => ({ key: newKey(), ...i }), emptyIngredient)
  )
  const [steps, setSteps] = useState(() =>
    initialRows(note.steps, (text) => ({ key: newKey(), text }), emptyStep)
  )

  /** 送信内容を組み立てる。入力に誤りがあればエラーメッセージを返す */
  const toFields = useCallback((): { fields: RecipeNoteFields } | { error: string } => {
    if (!title.trim()) return { error: 'タイトルを入力してください' }
    const cookingTimeMinutes = parseCookingTime(cookingTime)
    if (cookingTimeMinutes === undefined) return { error: '調理時間は1以上の整数で入力してください' }
    return {
      fields: {
        title: title.trim(),
        ingredients: ingredients.map(({ name, amount }) => ({ name, amount })),
        steps: steps.map((s) => s.text),
        imageKey,
        servings: servings.trim() || null,
        memo: memo.trim() || null,
        cookingTimeMinutes,
      },
    }
  }, [title, cookingTime, ingredients, steps, imageKey, servings, memo])

  return {
    values: { title, servings, cookingTime, imageKey, memo, ingredients, steps },
    setters: { setTitle, setServings, setCookingTime, setImageKey, setMemo, setIngredients, setSteps },
    toFields,
  }
}
