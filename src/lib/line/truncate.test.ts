import { describe, it, expect } from 'vitest'
import { truncateByCodePoint } from './truncate'

describe('truncateByCodePoint', () => {
  it('上限以内ならそのまま返す', () => {
    expect(truncateByCodePoint('親子丼', 3)).toBe('親子丼')
  })

  it('超えたら末尾を「…」にして上限に収める', () => {
    expect(truncateByCodePoint('あいうえお', 3)).toBe('あい…')
  })

  it('絵文字（サロゲートペア）の途中で切らない', () => {
    const result = truncateByCodePoint('🍳🍳🍳🍳', 4)
    expect(result).toBe('🍳…')
    expect(result.isWellFormed()).toBe(true)
  })
})
