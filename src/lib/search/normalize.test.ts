import { describe, it, expect } from 'vitest'
import { normalizeSearchKey, splitSearchWords, toKatakana } from './normalize'

describe('toKatakana', () => {
  it('ひらがなをカタカナに変換する', () => {
    expect(toKatakana('じゃがいも')).toBe('ジャガイモ')
    expect(toKatakana('しいたけ')).toBe('シイタケ')
  })

  it('カタカナ・漢字・記号はそのまま', () => {
    expect(toKatakana('トマト')).toBe('トマト')
    expect(toKatakana('豚バラ肉')).toBe('豚バラ肉')
    expect(toKatakana('豆腐・大豆製品')).toBe('豆腐・大豆製品')
  })

  it('長音符は変換しない', () => {
    expect(toKatakana('ベーコン')).toBe('ベーコン')
  })
})

describe('normalizeSearchKey', () => {
  it('ひらがなとカタカナが同じキーになる', () => {
    expect(normalizeSearchKey('じゃがいも')).toBe(normalizeSearchKey('ジャガイモ'))
    expect(normalizeSearchKey('もやし')).toBe(normalizeSearchKey('モヤシ'))
  })

  it('全角英数を半角にする', () => {
    expect(normalizeSearchKey('ＴＯＭＡＴＯ')).toBe('tomato')
    expect(normalizeSearchKey('１２３')).toBe('123')
  })

  it('大文字小文字を吸収する', () => {
    expect(normalizeSearchKey('Tomato')).toBe(normalizeSearchKey('TOMATO'))
    expect(normalizeSearchKey('ＢＢＱ')).toBe(normalizeSearchKey('bbq'))
  })

  it('前後の空白を落とす', () => {
    expect(normalizeSearchKey('  トマト  ')).toBe('トマト')
  })

  it('漢字はそのまま（かな正規化では吸収できない）', () => {
    // 「たまねぎ」と「玉ねぎ」は別キー。この吸収はエイリアスの役割
    expect(normalizeSearchKey('たまねぎ')).not.toBe(normalizeSearchKey('玉ねぎ'))
  })
})

describe('splitSearchWords', () => {
  it('半角・全角スペースの両方で分割する', () => {
    expect(splitSearchWords('豚肉 玉ねぎ')).toEqual(['豚肉', '玉ねぎ'])
    expect(splitSearchWords('豚肉　玉ねぎ')).toEqual(['豚肉', '玉ねぎ'])
    expect(splitSearchWords('豚肉　玉ねぎ にんじん')).toEqual(['豚肉', '玉ねぎ', 'にんじん'])
  })

  it('連続する空白や前後の空白で空要素を作らない', () => {
    expect(splitSearchWords('  豚肉　　玉ねぎ  ')).toEqual(['豚肉', '玉ねぎ'])
  })

  it('空文字・空白のみは空配列', () => {
    expect(splitSearchWords('')).toEqual([])
    expect(splitSearchWords('   　 ')).toEqual([])
  })
})
