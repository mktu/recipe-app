import { describe, it, expect } from 'vitest'
import { buildIngredientsPostbackData, parseIngredientsPostback, toIngredientsDisplayText } from './ingredients-postback'

const RECIPE_ID = '3f2b8c1e-9a4d-4e2b-8f6a-1c2d3e4f5a6b'

describe('ingredients postback data', () => {
  it('組み立てた data から recipeId を取り出せる', () => {
    expect(parseIngredientsPostback(buildIngredientsPostbackData(RECIPE_ID))).toBe(RECIPE_ID)
  })

  it('data は LINE の上限（300 文字）に収まる', () => {
    expect(buildIngredientsPostbackData(RECIPE_ID).length).toBeLessThanOrEqual(300)
  })

  it('別の action や recipeId の無い data は null', () => {
    expect(parseIngredientsPostback('action=other&recipeId=x')).toBeNull()
    expect(parseIngredientsPostback('action=ingredients')).toBeNull()
    expect(parseIngredientsPostback('')).toBeNull()
  })
})

describe('toIngredientsDisplayText', () => {
  it('タイトルの後ろに「の材料」を付ける', () => {
    expect(toIngredientsDisplayText('だしたまぶっかけ')).toBe('だしたまぶっかけの材料')
  })

  it('長いタイトルでも 300 文字以内に収める（見出しの無いノートは本文の行がタイトルになる）', () => {
    const text = toIngredientsDisplayText('あ'.repeat(1000))
    expect(text.length).toBeLessThanOrEqual(300)
    expect(text.endsWith('の材料')).toBe(true)
  })
})
