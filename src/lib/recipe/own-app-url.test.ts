import { afterEach, describe, expect, it, vi } from 'vitest'
import { isOwnAppUrl } from './own-app-url'

describe('isOwnAppUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('NEXT_PUBLIC_APP_URL が設定されているとき', () => {
    const APP_URL = 'https://recipe.example.com'

    it('アプリのマイレシピの URL は対象', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
      expect(isOwnAppUrl(`${APP_URL}/notes/abc-123`)).toBe(true)
    })

    it('アプリのホームの URL も対象（レシピ以外のページ）', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
      expect(isOwnAppUrl(`${APP_URL}/`)).toBe(true)
    })

    it('APP_URL の末尾スラッシュの有無に左右されない', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', `${APP_URL}/`)
      expect(isOwnAppUrl(`${APP_URL}/notes/abc-123`)).toBe(true)
    })

    it('ホストの大文字小文字に左右されない', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
      expect(isOwnAppUrl('https://RECIPE.example.com/notes/abc-123')).toBe(true)
    })

    it('外部のレシピサイトは対象外', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
      expect(isOwnAppUrl('https://cookpad.com/recipe/123')).toBe(false)
    })

    it('ホストの一部が同じだけの別サイトは対象外', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
      expect(isOwnAppUrl('https://recipe.example.com.evil.test/notes/1')).toBe(false)
      expect(isOwnAppUrl('https://sub.recipe.example.com/notes/1')).toBe(false)
    })

    it('ポートが違えば別物（ローカルの localhost:3000 と他のアプリを区別する）', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
      expect(isOwnAppUrl('http://localhost:3000/notes/1')).toBe(true)
      expect(isOwnAppUrl('http://localhost:4000/recipe')).toBe(false)
    })
  })

  it('LIFF の URL は APP_URL に関係なく対象', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://recipe.example.com')
    expect(isOwnAppUrl('https://liff.line.me/1234567890-abcdefgh/notes/1')).toBe(true)
  })

  it('APP_URL が空（dev）でも LIFF の URL は対象、それ以外は対象外', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(isOwnAppUrl('https://liff.line.me/1234567890-abcdefgh')).toBe(true)
    expect(isOwnAppUrl('https://cookpad.com/recipe/123')).toBe(false)
  })

  it('URL として解釈できない文字列は対象外', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://recipe.example.com')
    expect(isOwnAppUrl('not a url')).toBe(false)
  })
})
