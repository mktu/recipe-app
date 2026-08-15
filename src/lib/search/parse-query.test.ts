import { describe, it, expect } from 'vitest'
import { isEmptyQuery, parseSearchQuery } from './parse-query'
import { testIndex } from './test-fixtures'

const parse = (input: string) => parseSearchQuery(testIndex, input)

describe('parseSearchQuery', () => {
  it('複数の食材語をグループに分ける（グループ間AND）', () => {
    const q = parse('豚肉 玉ねぎ')
    expect(q.ingredientGroups).toHaveLength(2)
    expect(q.textTerms).toEqual([])
  })

  it('全角スペースでも分割する', () => {
    const q = parse('豚肉　玉ねぎ')
    expect(q.ingredientGroups).toHaveLength(2)
  })

  it('親食材は子食材まで展開する', () => {
    const [group] = parse('豚肉').ingredientGroups
    expect(group.ids.sort()).toEqual(['m4', 'm5', 'm6'])
  })

  it('食材条件は元の入力語をテキスト照合用に保持する', () => {
    const [group] = parse('玉ねぎ').ingredientGroups
    expect(group.text).toBe('玉ねぎ')
  })

  it('カテゴリ語はテキスト照合に回さない（照合が広すぎるため）', () => {
    const [group] = parse('肉').ingredientGroups
    expect(group.text).toBeNull()
  })

  it('食材に解決できない語はテキスト条件になる', () => {
    const q = parse('豚肉 カレー')
    expect(q.ingredientGroups).toHaveLength(1)
    expect(q.textTerms).toEqual(['カレー'])
  })

  it('複数のテキスト語を個別に保持する（語間AND）', () => {
    const q = parse('簡単 カレー')
    expect(q.ingredientGroups).toEqual([])
    expect(q.textTerms).toEqual(['簡単', 'カレー'])
  })

  it('重複した語は1つにまとめる', () => {
    const q = parse('玉ねぎ たまねぎ タマネギ')
    expect(q.ingredientGroups).toHaveLength(1)
  })

  it('空入力は空クエリになる', () => {
    expect(isEmptyQuery(parse(''))).toBe(true)
    expect(isEmptyQuery(parse('   '))).toBe(true)
    expect(isEmptyQuery(parse('豚肉'))).toBe(false)
  })
})
