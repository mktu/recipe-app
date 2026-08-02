import { describe, it, expect } from 'vitest'
import {
  buildIngredientIndex,
  buildIngredientIndexFromRows,
  expandWithChildren,
  type AliasRow,
  type IngredientRow,
} from './ingredient-index'
import { normalizeSearchKey } from './normalize'

const rows: IngredientRow[] = [
  { id: 'm1', name: '豚肉', category: '肉', parent_id: null },
  { id: 'm2', name: '豚バラ肉', category: '肉', parent_id: 'm1' },
  { id: 'm3', name: '豚こま切れ肉', category: '肉', parent_id: 'm1' },
  { id: 'v1', name: 'たまねぎ', category: '野菜', parent_id: null },
  { id: 'd1', name: '牛乳', category: '卵・乳製品', parent_id: null },
]

const aliasRows: AliasRow[] = [
  { alias: '玉ねぎ', ingredient_id: 'v1' },
  { alias: '豚こま', ingredient_id: 'm3' },
]

describe('buildIngredientIndexFromRows', () => {
  it('DB の行（snake_case）から索引を組み立てる', () => {
    const index = buildIngredientIndexFromRows(rows, aliasRows)
    expect(index.byId.get('m2')?.name).toBe('豚バラ肉')
    expect(index.exactMap.get(normalizeSearchKey('玉ねぎ'))).toBe('v1')
  })

  it('parent_id を親子関係として取り込む', () => {
    const index = buildIngredientIndexFromRows(rows, aliasRows)
    expect(index.childrenMap.get('m1')?.sort()).toEqual(['m2', 'm3'])
    expect(index.byId.get('m2')?.parentId).toBe('m1')
  })

  it('空配列でも壊れない', () => {
    const index = buildIngredientIndexFromRows([], [])
    expect(index.all).toEqual([])
    expect(index.nameKeys).toEqual([])
  })
})

describe('buildIngredientIndex', () => {
  const index = buildIngredientIndexFromRows(rows, aliasRows)

  it('マスタ名とエイリアスの両方を正規化キーで引ける', () => {
    expect(index.exactMap.get(normalizeSearchKey('たまねぎ'))).toBe('v1')
    expect(index.exactMap.get(normalizeSearchKey('タマネギ'))).toBe('v1')
    expect(index.exactMap.get(normalizeSearchKey('豚こま'))).toBe('m3')
  })

  it('キーが衝突した場合はマスタ名がエイリアスより優先される', () => {
    const conflicting = buildIngredientIndex(
      [
        { id: 'a', name: 'ねぎ', category: '野菜', parentId: null },
        { id: 'b', name: '長ねぎ', category: '野菜', parentId: null },
      ],
      // マスタ名と同じ「ねぎ」を別食材のエイリアスとして登録
      [{ alias: 'ねぎ', ingredientId: 'b' }]
    )
    expect(conflicting.exactMap.get(normalizeSearchKey('ねぎ'))).toBe('a')
  })

  it('カテゴリは全体と区切り単位の両方で引ける', () => {
    expect(index.categoryMap.get(normalizeSearchKey('卵・乳製品'))).toEqual(['d1'])
    expect(index.categoryMap.get(normalizeSearchKey('乳製品'))).toEqual(['d1'])
    expect(index.categoryMap.get(normalizeSearchKey('卵'))).toEqual(['d1'])
    expect(index.categoryMap.get(normalizeSearchKey('肉'))?.sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('nameKeys は部分一致のために短い順に並ぶ', () => {
    const lengths = index.nameKeys.map((n) => n.key.length)
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b))
  })

  it('存在しない食材IDのエイリアスは取り込まない', () => {
    const withOrphan = buildIngredientIndexFromRows(rows, [
      { alias: 'ゾンビ', ingredient_id: 'missing' },
    ])
    expect(withOrphan.exactMap.get(normalizeSearchKey('ゾンビ'))).toBeUndefined()
  })
})

describe('expandWithChildren', () => {
  const index = buildIngredientIndexFromRows(rows, aliasRows)

  it('親食材は子食材まで展開する', () => {
    expect(expandWithChildren(index, ['m1']).sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('子食材は親まで遡らない', () => {
    expect(expandWithChildren(index, ['m2'])).toEqual(['m2'])
  })

  it('複数IDをまとめて展開し重複を除く', () => {
    expect(expandWithChildren(index, ['m1', 'm2', 'v1']).sort()).toEqual(['m1', 'm2', 'm3', 'v1'])
  })

  it('未知のIDはそのまま返す', () => {
    expect(expandWithChildren(index, ['unknown'])).toEqual(['unknown'])
  })
})
