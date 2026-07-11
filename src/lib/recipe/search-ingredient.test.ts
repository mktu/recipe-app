import { describe, it, expect } from 'vitest'
import { toKatakana, filterIngredientsByQuery } from './search-ingredient'

describe('toKatakana', () => {
  it('ひらがなをカタカナに変換する', () => {
    expect(toKatakana('とまと')).toBe('トマト')
    expect(toKatakana('たまねぎ')).toBe('タマネギ')
  })

  it('カタカナ・漢字・英数字はそのまま', () => {
    expect(toKatakana('トマト')).toBe('トマト')
    expect(toKatakana('豚肉')).toBe('豚肉')
    expect(toKatakana('abc123')).toBe('abc123')
  })
})

describe('filterIngredientsByQuery', () => {
  const ingredients = [
    { id: '1', name: 'トマト' },
    { id: '2', name: 'ミニトマト' },
    { id: '3', name: 'たまねぎ' },
    { id: '4', name: '鶏もも肉' },
  ]

  it('空クエリは空配列を返す', () => {
    expect(filterIngredientsByQuery(ingredients, '')).toEqual([])
    expect(filterIngredientsByQuery(ingredients, '   ')).toEqual([])
  })

  it('部分一致でヒットする', () => {
    const result = filterIngredientsByQuery(ingredients, 'トマト')
    expect(result.map((i) => i.id)).toEqual(['1', '2'])
  })

  it('ひらがな入力でカタカナ食材にヒットする', () => {
    const result = filterIngredientsByQuery(ingredients, 'とまと')
    expect(result.map((i) => i.id)).toEqual(['1', '2'])
  })

  it('カタカナ入力でひらがな食材にヒットする', () => {
    const result = filterIngredientsByQuery(ingredients, 'タマネギ')
    expect(result.map((i) => i.id)).toEqual(['3'])
  })

  it('excludeIds に含まれる食材は除外する', () => {
    const result = filterIngredientsByQuery(ingredients, 'トマト', new Set(['1']))
    expect(result.map((i) => i.id)).toEqual(['2'])
  })

  it('一致なしは空配列', () => {
    expect(filterIngredientsByQuery(ingredients, 'さんま')).toEqual([])
  })
})
