import { describe, it, expect } from 'vitest'
import { filterRecipesByQuery, type SearchableRecipe } from './filter-recipes'
import { parseSearchQuery } from './parse-query'
import { testIndex } from './test-fixtures'

type Recipe = SearchableRecipe & { id: string }

const recipes: Recipe[] = [
  {
    id: 'r1',
    title: 'basic 肉じゃが',
    memo: '定番',
    sourceName: 'クックパッド',
    ingredientsRaw: [
      { name: '豚こま切れ肉', amount: '200g' },
      { name: 'じゃがいも', amount: '3個' },
      { name: '玉ねぎ', amount: '1個' },
    ],
    ingredientIds: ['m6', 'v2', 'v1'],
    ingredientNames: ['豚こま切れ肉', 'じゃがいも', 'たまねぎ'],
  },
  {
    id: 'r2',
    title: 'チキンカレー',
    memo: null,
    sourceName: 'クラシル',
    ingredientsRaw: [
      { name: 'チキン', amount: '300g' },
      { name: '玉ねぎ', amount: '2個' },
    ],
    ingredientIds: ['m1', 'v1'],
    ingredientNames: ['鶏肉', 'たまねぎ'],
  },
  {
    id: 'r3',
    title: 'サーモンのムニエル',
    memo: '簡単',
    sourceName: null,
    ingredientsRaw: [
      { name: '鮭', amount: '2切れ' },
      { name: 'ディル', amount: '少々' }, // マスタにない食材
    ],
    ingredientIds: ['f1'],
    ingredientNames: ['鮭'],
  },
  {
    // タイトルにだけ食材名が入っており、食材の紐付けが無い（Issue #154 のサイトB）
    id: 'r4',
    title: 'たっぷりトマトパスタ',
    memo: null,
    sourceName: null,
    ingredientsRaw: [],
    ingredientIds: [],
    ingredientNames: [],
  },
  {
    // 食材は紐付いているがタイトルには出てこない（Issue #154 のサイトA）
    id: 'r5',
    title: '夏野菜の煮込み',
    memo: null,
    sourceName: null,
    ingredientsRaw: [
      { name: 'トマト', amount: '2個' },
      { name: 'なす', amount: '1本' },
    ],
    ingredientIds: ['v5', 'v3'],
    ingredientNames: ['トマト', 'なす'],
  },
  {
    // カテゴリ語のテキスト照合を有効にすると誤ヒットするレシピ
    id: 'r6',
    title: '肉なしヘルシー麻婆豆腐',
    memo: null,
    sourceName: null,
    ingredientsRaw: [{ name: '豆腐', amount: '1丁' }],
    ingredientIds: ['t1'],
    ingredientNames: ['豆腐'],
  },
]

const search = (input: string) =>
  filterRecipesByQuery(recipes, parseSearchQuery(testIndex, input)).map((r) => r.id)

describe('filterRecipesByQuery', () => {
  it('複数の食材語は AND で絞り込む', () => {
    expect(search('豚肉 玉ねぎ')).toEqual(['r1'])
    expect(search('じゃがいも 玉ねぎ')).toEqual(['r1'])
    expect(search('鮭 玉ねぎ')).toEqual([])
  })

  it('親食材で子食材のレシピがヒットする', () => {
    expect(search('豚肉')).toEqual(['r1']) // レシピの食材は豚こま切れ肉
  })

  it('カテゴリ語は候補の OR で絞り込む', () => {
    expect(search('肉 玉ねぎ').sort()).toEqual(['r1', 'r2'])
    expect(search('魚')).toEqual(['r3'])
  })

  it('食材IDに正規化済みなので材料の表記ゆれを越えてヒットする', () => {
    // 材料表記は「チキン」だが 鶏肉 に紐付いているので「鶏」で当たる
    expect(search('鶏')).toEqual(['r2'])
  })

  it('テキスト語は AND で絞り込む', () => {
    expect(search('カレー')).toEqual(['r2'])
    expect(search('カレー 簡単')).toEqual([])
    expect(search('ムニエル 簡単')).toEqual(['r3'])
  })

  it('食材語とテキスト語を組み合わせられる', () => {
    expect(search('玉ねぎ カレー')).toEqual(['r2'])
  })

  it('テキスト語はサイト名にも一致する', () => {
    expect(search('クラシル')).toEqual(['r2'])
  })

  it('マスタにない食材でも材料テキストで拾える', () => {
    expect(search('ディル')).toEqual(['r3'])
    expect(search('ディル 鮭')).toEqual(['r3'])
  })

  it('空クエリは全件返す', () => {
    expect(search('')).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6'])
  })

  // Issue #154: 食材に解決した語もタイトル等のテキストを見る
  describe('食材語のテキスト照合', () => {
    it('食材に紐付いたレシピとタイトルだけ一致するレシピの両方がヒットする', () => {
      expect(search('トマト').sort()).toEqual(['r4', 'r5'])
    })

    it('タイトルだけの一致でもグループ間 AND は満たせる', () => {
      // r4 はトマトもパスタもタイトル一致のみ / r5 はパスタを満たさないので落ちる
      expect(search('トマト パスタ')).toEqual(['r4'])
    })

    it('食材のみのクエリでもテキスト条件と組み合わせられる', () => {
      expect(search('トマト 煮込み')).toEqual(['r5'])
    })

    it('カテゴリ語はテキスト照合に回さない', () => {
      // 「肉なしヘルシー麻婆豆腐」(r6) を「肉」で拾ってしまわないこと
      expect(search('肉').sort()).toEqual(['r1', 'r2'])
    })
  })
})
