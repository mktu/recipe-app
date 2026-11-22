import { describe, it, expect } from 'vitest'
import { createSingleRecipeMessage, type RecipeCardData } from './flex-message'

const card = (title: string): RecipeCardData => ({
  title,
  url: 'https://example.com/api/track/recipe/abc',
  imageUrl: 'https://example.com/image.jpg',
  sourceName: 'テストサイト',
  cookingTimeMinutes: 15,
  ingredientCount: 5,
})

describe('createSingleRecipeMessage', () => {
  it('タイトルが長くても altText を400文字以内に収める（見出しの無いノートは本文の行がタイトルになる）', () => {
    const message = createSingleRecipeMessage(card('あ'.repeat(1000)))
    expect(message.altText.length).toBeLessThanOrEqual(400)
  })

  it('短いタイトルの altText はそのまま', () => {
    expect(createSingleRecipeMessage(card('だしたまぶっかけ')).altText).toBe('レシピ: だしたまぶっかけ')
  })
})
