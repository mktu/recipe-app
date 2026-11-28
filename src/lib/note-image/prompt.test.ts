import { describe, expect, it } from 'vitest'
import { buildNoteImagePrompt, ingredientNames } from './prompt'

describe('ingredientNames', () => {
  it('材料名だけを取り出し、分量は送らない', () => {
    expect(ingredientNames([{ name: 'なす', amount: '2本' }, { name: ' 豚ひき肉 ', amount: '100g' }])).toEqual(['なす', '豚ひき肉'])
  })

  it('名前の無い行・配列でない値は無視する', () => {
    expect(ingredientNames([{ name: '' }, { amount: '1本' }, null, 'なす'])).toEqual([])
    expect(ingredientNames(null)).toEqual([])
  })

  it('材料は先頭の 8 個までにする', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `材料${i}` }))
    expect(ingredientNames(many)).toHaveLength(8)
  })
})

describe('buildNoteImagePrompt', () => {
  it('料理名と材料名を載せる', () => {
    const prompt = buildNoteImagePrompt('なすの味噌炒め', [{ name: 'なす', amount: '2本' }])
    expect(prompt).toContain('なすの味噌炒め (ingredients: なす)')
    expect(prompt).not.toContain('2本')
  })

  it('材料が無ければ料理名だけで作る', () => {
    expect(buildNoteImagePrompt('カレー', [])).toContain('home-cooked dish: カレー.')
  })
})
