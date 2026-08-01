import { describe, it, expect } from 'vitest'
import { resolveTerm } from './resolve-term'
import { testIndex } from './test-fixtures'

const ids = (word: string) => resolveTerm(testIndex, word)?.ids ?? null
const kind = (word: string) => resolveTerm(testIndex, word)?.kind ?? null

describe('resolveTerm - 完全一致', () => {
  it('マスタ名で解決する', () => {
    expect(ids('たまねぎ')).toEqual(['v1'])
    expect(kind('たまねぎ')).toBe('exact')
  })

  it('エイリアスで解決する', () => {
    expect(ids('玉ねぎ')).toEqual(['v1'])
    expect(ids('豚こま')).toEqual(['m6'])
    expect(ids('チキン')).toEqual(['m1'])
  })

  it('ひらがな/カタカナの違いを吸収する', () => {
    expect(ids('ジャガイモ')).toEqual(['v2'])
    expect(ids('ナス')).toEqual(['v3'])
    expect(ids('モヤシ')).toEqual(['v4'])
    expect(ids('シイタケ')).toEqual(['k1'])
  })

  it('全角英数・大文字小文字を吸収する', () => {
    expect(ids('ＴＯＭＡＴＯ')).toBe(null) // マスタにない語は解決しない
    expect(ids('チーズ')).toEqual(['d2'])
  })
})

describe('resolveTerm - カテゴリ', () => {
  it('カテゴリ名でそのカテゴリの食材をすべて返す', () => {
    expect(kind('肉')).toBe('category')
    expect(ids('肉')).toEqual(expect.arrayContaining(['m1', 'm4', 'm7', 'm8']))
    expect(ids('肉')).not.toContain('d1') // 牛乳は肉カテゴリではない
  })

  it('総称語をカテゴリに読み替える（魚 → 魚介）', () => {
    expect(kind('魚')).toBe('category')
    expect(ids('魚')?.sort()).toEqual(['f1', 'f2'])
  })

  it('複合カテゴリは区切り単位でも引ける（乳製品 → 卵・乳製品）', () => {
    expect(ids('乳製品')?.sort()).toEqual(['d1', 'd2'])
  })

  it('食材名として完全一致する語はカテゴリより優先される', () => {
    expect(kind('豆腐')).toBe('exact')
    expect(ids('豆腐')).toEqual(['t1'])
  })
})

describe('resolveTerm - 部分一致', () => {
  it('マスタ名が入力に含まれる場合は最長を1件返す（トマト缶 → トマト）', () => {
    expect(kind('トマト缶')).toBe('contained')
    expect(ids('トマト缶')).toEqual(['v5'])
  })

  it('入力がマスタ名に含まれる場合は候補を返す（豚バラ → 豚バラ肉）', () => {
    expect(kind('豚バラ')).toBe('including')
    expect(ids('豚バラ')).toEqual(['m5'])
    expect(ids('鶏むね')).toEqual(['m2'])
  })

  it('候補が複数ある語は絞り込まずすべて返す', () => {
    expect(ids('豚')?.sort()).toEqual(['m4', 'm5', 'm6'])
    expect(ids('いも')?.sort()).toEqual(['v2', 'v8'])
  })
})

describe('resolveTerm - 解決できない語', () => {
  it('食材と無関係な語は null を返す', () => {
    expect(resolveTerm(testIndex, 'カレー')).toBe(null)
    expect(resolveTerm(testIndex, '簡単')).toBe(null)
    expect(resolveTerm(testIndex, '')).toBe(null)
  })
})
