import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHeroImage, createThumbnail, toFlexImageUrl } from './flex-image'

const APP_URL = 'https://recipe.example.com'
const TITLE = 'なすの味噌炒め'
const COVER_URL = `${APP_URL}/api/cover?title=${encodeURIComponent(TITLE)}`

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('toFlexImageUrl', () => {
  it('外部サイト・AI 画像の絶対 URL はそのまま返す', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl('https://cdn.example.org/a.jpg', TITLE)).toBe('https://cdn.example.org/a.jpg')
  })

  it('ノートのプレースホルダー（相対パス）は APP_URL と合成する', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl('/placeholders/japanese.png', TITLE)).toBe(`${APP_URL}/placeholders/japanese.png`)
  })

  it('APP_URL の末尾スラッシュがあってもパスが二重にならない', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', `${APP_URL}/`)
    expect(toFlexImageUrl('/placeholders/japanese.png', TITLE)).toBe(`${APP_URL}/placeholders/japanese.png`)
  })

  it('画像を持たないレシピには料理名の表紙を当てる', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl(null, TITLE)).toBe(COVER_URL)
    expect(toFlexImageUrl('', TITLE)).toBe(COVER_URL)
  })

  it('APP_URL が無いと相対パスは絶対 URL にできないので null を返す', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(toFlexImageUrl('/placeholders/japanese.png', TITLE)).toBeNull()
    expect(toFlexImageUrl(null, TITLE)).toBeNull()
  })

  it('APP_URL が http だと Flex に渡せないので null を返す（.env.example の localhost）', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    expect(toFlexImageUrl('/placeholders/japanese.png', TITLE)).toBeNull()
    expect(toFlexImageUrl(null, TITLE)).toBeNull()
  })

  it('画像が http なら表紙に差し替える（ローカルの Storage の AI 画像もこれに当たる）', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl('http://cdn.example.org/a.jpg', TITLE)).toBe(COVER_URL)
  })

  it('URL として解釈できない値でも例外を投げず表紙に差し替える', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl('not a url', TITLE)).toBe(COVER_URL)
  })
})

describe('Flex の image コンポーネント', () => {
  it('URL を作れないときは hero もサムネイルも省く（不正な URL で reply を落とさない）', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(createHeroImage('/placeholders/japanese.png', TITLE)).toBeUndefined()
    expect(createThumbnail('/placeholders/japanese.png', TITLE)).toEqual([])
  })

  it('URL を作れるときは絶対 URL で image を返す', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(createHeroImage('/placeholders/soup.png', TITLE)?.url).toBe(`${APP_URL}/placeholders/soup.png`)
    expect(createThumbnail('/placeholders/soup.png', TITLE)[0]?.url).toBe(`${APP_URL}/placeholders/soup.png`)
  })
})
