import { afterEach, describe, expect, it, vi } from 'vitest'
import { toTrackRedirectUrl } from './track-redirect'

const REQUEST_URL = 'https://recipe.example.com/api/track/recipe/abc'

afterEach(() => {
  vi.unstubAllEnvs()
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
