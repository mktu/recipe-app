import { describe, it, expect } from 'vitest'
import { looksLikeAmount, parseGroupLabel, splitIngredientLine, splitInlineGroup, withGroup } from './ingredient-line'

describe('splitIngredientLine', () => {
  it('最後の空白で名前と分量に分ける', () => {
    expect(splitIngredientLine('鶏むね肉 300g')).toEqual({ name: '鶏むね肉', amount: '300g' })
    expect(splitIngredientLine('レモン 1/2個')).toEqual({ name: 'レモン', amount: '1/2個' })
    expect(splitIngredientLine('酒 大さじ2')).toEqual({ name: '酒', amount: '大さじ2' })
    expect(splitIngredientLine('塩 少々')).toEqual({ name: '塩', amount: '少々' })
  })

  it('全角空白や名前の中の括弧を扱える', () => {
    expect(splitIngredientLine('鶏もも肉（皮なし）　300g')).toEqual({ name: '鶏もも肉（皮なし）', amount: '300g' })
  })

  it('名前を正規化しない（ブランド名や切り方を削らない）', () => {
    expect(splitIngredientLine('キッコーマン醤油 大さじ1')).toEqual({ name: 'キッコーマン醤油', amount: '大さじ1' })
  })

  it('コロンや三点リーダーの区切りを扱える', () => {
    expect(splitIngredientLine('鶏むね肉：300g')).toEqual({ name: '鶏むね肉', amount: '300g' })
    expect(splitIngredientLine('玉ねぎ……1個')).toEqual({ name: '玉ねぎ', amount: '1個' })
  })

  it('空白なしで続く分量を分ける', () => {
    expect(splitIngredientLine('卵2個')).toEqual({ name: '卵', amount: '2個' })
    expect(splitIngredientLine('酒大さじ2')).toEqual({ name: '酒', amount: '大さじ2' })
  })

  it('範囲・約・各・括弧付きの分量を扱える', () => {
    expect(splitIngredientLine('なす 2〜3本')).toEqual({ name: 'なす', amount: '2〜3本' })
    expect(splitIngredientLine('しょうが 約10g')).toEqual({ name: 'しょうが', amount: '約10g' })
    expect(splitIngredientLine('醤油・みりん 各大さじ1')).toEqual({ name: '醤油・みりん', amount: '各大さじ1' })
    expect(splitIngredientLine('鶏もも肉 1枚（300g）')).toEqual({ name: '鶏もも肉', amount: '1枚（300g）' })
  })

  it('「大さじ1と1/2」と全角チルダ「～」の分量を分ける（名前に入ると食材照合に失敗する）', () => {
    expect(splitIngredientLine('醤油 大さじ1と1/2')).toEqual({ name: '醤油', amount: '大さじ1と1/2' })
    expect(splitIngredientLine('醤油大さじ1と1/2')).toEqual({ name: '醤油', amount: '大さじ1と1/2' })
    expect(splitIngredientLine('トマト 2～3個')).toEqual({ name: 'トマト', amount: '2～3個' })
  })

  it('数字に挟まれていない「と」は分量にしない', () => {
    expect(splitIngredientLine('塩とこしょう')).toEqual({ name: '塩とこしょう', amount: '' })
  })

  it('分量が無ければ行全体を名前にする', () => {
    expect(splitIngredientLine('塩')).toEqual({ name: '塩', amount: '' })
    expect(splitIngredientLine('サラダ油')).toEqual({ name: 'サラダ油', amount: '' })
    expect(splitIngredientLine('7分づき米')).toEqual({ name: '7分づき米', amount: '' })
  })

  it('分量らしくない後ろの語では分けない', () => {
    expect(splitIngredientLine('ブラック ペッパー')).toEqual({ name: 'ブラック ペッパー', amount: '' })
  })
})

describe('looksLikeAmount', () => {
  it('分量の表現を判定する', () => {
    expect(looksLikeAmount('300g')).toBe(true)
    expect(looksLikeAmount('１個')).toBe(true)
    expect(looksLikeAmount('小さじ1/2')).toBe(true)
    expect(looksLikeAmount('適量')).toBe(true)
    expect(looksLikeAmount('ペッパー')).toBe(false)
  })
})

describe('グループ', () => {
  it('グループ見出しを判定する', () => {
    expect(parseGroupLabel('【A】')).toBe('A')
    expect(parseGroupLabel('＜たれ＞')).toBe('たれ')
    expect(parseGroupLabel('■合わせ調味料')).toBe('合わせ調味料')
    expect(parseGroupLabel('A:')).toBe('A')
    expect(parseGroupLabel('鶏むね肉 300g')).toBeNull()
  })

  it('行頭のグループ記号を名前から外す', () => {
    expect(splitInlineGroup('【A】醤油 大さじ1')).toEqual({ group: 'A', text: '醤油 大さじ1' })
    expect(splitInlineGroup('醤油 大さじ1')).toEqual({ group: null, text: '醤油 大さじ1' })
  })

  it('グループは名前ではなく分量の側に残す（食材マスタとの照合を壊さないため）', () => {
    expect(withGroup({ name: '醤油', amount: '大さじ1' }, 'A')).toEqual({ name: '醤油', amount: '大さじ1（A）' })
    expect(withGroup({ name: '塩', amount: '' }, 'A')).toEqual({ name: '塩', amount: '（A）' })
  })
})
