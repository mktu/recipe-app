import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHeroImage, createThumbnail, toFlexImageUrl } from './flex-image'

const APP_URL = 'https://recipe.example.com'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('toFlexImageUrl', () => {
  it('外部サイトの絶対 URL はそのまま返す', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl('https://cdn.example.org/a.jpg')).toBe('https://cdn.example.org/a.jpg')
  })

  it('ノートのプレースホルダー（相対パス）は APP_URL と合成する', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl('/placeholders/japanese.png')).toBe(`${APP_URL}/placeholders/japanese.png`)
  })

  it('APP_URL の末尾スラッシュがあってもパスが二重にならない', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', `${APP_URL}/`)
    expect(toFlexImageUrl('/placeholders/japanese.png')).toBe(`${APP_URL}/placeholders/japanese.png`)
  })

  it('画像を持たないレシピには NO IMAGE 画像を当てる', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(toFlexImageUrl(null)).toBe(`${APP_URL}/placeholders/default.png`)
    expect(toFlexImageUrl('')).toBe(`${APP_URL}/placeholders/default.png`)
  })

  it('APP_URL が無いと相対パスは絶対 URL にできないので null を返す', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(toFlexImageUrl('/placeholders/japanese.png')).toBeNull()
    expect(toFlexImageUrl(null)).toBeNull()
  })
})

describe('Flex の image コンポーネント', () => {
  it('URL を作れないときは hero もサムネイルも省く（不正な URL で reply を落とさない）', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(createHeroImage('/placeholders/japanese.png')).toBeUndefined()
    expect(createThumbnail('/placeholders/japanese.png')).toEqual([])
  })

  it('URL を作れるときは絶対 URL で image を返す', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    expect(createHeroImage('/placeholders/soup.png')?.url).toBe(`${APP_URL}/placeholders/soup.png`)
    expect(createThumbnail('/placeholders/soup.png')[0]?.url).toBe(`${APP_URL}/placeholders/soup.png`)
  })
})
