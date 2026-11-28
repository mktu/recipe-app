import { describe, expect, it } from 'vitest'
import { COVER_TITLE_MAX_LENGTH, coverColor, coverImagePath, normalizeCoverTitle, recipeImageOrCover } from './cover-image'

describe('coverColor', () => {
  it('同じ料理名なら同じ色、前後の空白は無視する', () => {
    expect(coverColor('なすの味噌炒め')).toBe(coverColor('  なすの味噌炒め '))
  })

  it('料理名が違えば色が分かれる', () => {
    const titles = ['カレー', '肉じゃが', '親子丼', 'ハンバーグ', 'ペペロンチーノ', '麻婆豆腐']
    expect(new Set(titles.map(coverColor)).size).toBeGreaterThan(1)
  })
})

describe('coverImagePath', () => {
  it('料理名をクエリに入れる', () => {
    expect(coverImagePath('鶏の照り焼き')).toBe(`/api/cover?title=${encodeURIComponent('鶏の照り焼き')}`)
  })

  it('長すぎる料理名は切る（サロゲートペアを壊さない）', () => {
    const long = '𩸽'.repeat(COVER_TITLE_MAX_LENGTH + 5)
    expect(Array.from(normalizeCoverTitle(long))).toHaveLength(COVER_TITLE_MAX_LENGTH)
  })
})

describe('recipeImageOrCover', () => {
  it('画像があればそれ、無ければ表紙', () => {
    expect(recipeImageOrCover('https://cdn.example.org/a.jpg', 'カレー')).toBe('https://cdn.example.org/a.jpg')
    expect(recipeImageOrCover(null, 'カレー')).toBe(coverImagePath('カレー'))
    expect(recipeImageOrCover('', 'カレー')).toBe(coverImagePath('カレー'))
  })
})
