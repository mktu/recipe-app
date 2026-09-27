import { afterEach, describe, expect, it, vi } from 'vitest'
import { toRecipeCardUrl, toTrackRedirectUrl } from './track-redirect'

const REQUEST_URL = 'https://recipe.example.com/api/track/recipe/abc'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('toRecipeCardUrl', () => {
  it('ノート（相対パス）は track ルートを挟まず LIFF URL を載せ、LINE から開いた印を付ける', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '1234-abcd')
    expect(toRecipeCardUrl({ id: 'r1', url: '/notes/n1' })).toBe('https://liff.line.me/1234-abcd/notes/n1?from=line')
  })

  it('外部サイトのレシピは track ルートを経由する', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '1234-abcd')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://recipe.example.com')
    expect(toRecipeCardUrl({ id: 'r1', url: 'https://cookpad.com/recipe/1' })).toBe('https://recipe.example.com/api/track/recipe/r1')
  })

  it('LIFF_ID が空（dev）ならノートも track ルートに回す', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://recipe.example.com')
    expect(toRecipeCardUrl({ id: 'r1', url: '/notes/n1' })).toBe('https://recipe.example.com/api/track/recipe/r1')
  })
})

describe('toTrackRedirectUrl', () => {
  it('ノート（相対パス）は LIFF URL に振り替える', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '1234-abcd')
    expect(toTrackRedirectUrl('/notes/n1', REQUEST_URL)).toBe('https://liff.line.me/1234-abcd/notes/n1')
  })

  it('外部サイトの絶対 URL は LIFF_ID があってもそのまま返す', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '1234-abcd')
    expect(toTrackRedirectUrl('https://cookpad.com/recipe/1', REQUEST_URL)).toBe('https://cookpad.com/recipe/1')
  })

  it('LIFF_ID が空（dev）のノートはリクエストのオリジンで解決する', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '')
    expect(toTrackRedirectUrl('/notes/n1', REQUEST_URL)).toBe('https://recipe.example.com/notes/n1')
  })
})
