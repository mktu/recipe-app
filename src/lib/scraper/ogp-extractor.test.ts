import { describe, it, expect } from 'vitest'
import { extractOgp } from './ogp-extractor'

const URL = 'https://www.example.com/recipes/123'

describe('extractOgp', () => {
  it('og:title / og:image / og:site_name を抽出する', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="鶏の唐揚げ" />
        <meta property="og:image" content="https://img.example.com/1.jpg" />
        <meta property="og:site_name" content="クッキングサイト" />
      </head></html>`
    expect(extractOgp(html, URL)).toEqual({
      title: '鶏の唐揚げ',
      imageUrl: 'https://img.example.com/1.jpg',
      sourceName: 'クッキングサイト',
    })
  })

  it('content が property より前にあっても抽出する', () => {
    const html = `<meta content="肉じゃが" property="og:title">`
    expect(extractOgp(html, URL)?.title).toBe('肉じゃが')
  })

  it('og:title が無ければ <title> タグにフォールバックする', () => {
    const html = `<html><head><title>カレーライス | レシピ</title></head></html>`
    expect(extractOgp(html, URL)?.title).toBe('カレーライス | レシピ')
  })

  it('og:site_name が無ければURLのドメイン名をソース名にする', () => {
    const html = `<meta property="og:title" content="味噌汁">`
    expect(extractOgp(html, URL)?.sourceName).toBe('Example')
  })

  it('HTMLエンティティをデコードする', () => {
    const html = `<meta property="og:title" content="塩&amp;こしょう炒め">`
    expect(extractOgp(html, URL)?.title).toBe('塩&こしょう炒め')
  })

  it('name 属性の og:title も拾う', () => {
    const html = `<meta name="og:title" content="親子丼">`
    expect(extractOgp(html, URL)?.title).toBe('親子丼')
  })

  it('タイトルが取得できなければ null を返す', () => {
    const html = `<html><head></head><body>no meta</body></html>`
    expect(extractOgp(html, URL)).toBeNull()
  })

  it('画像が無ければ imageUrl は空文字', () => {
    const html = `<meta property="og:title" content="冷奴">`
    expect(extractOgp(html, URL)?.imageUrl).toBe('')
  })
})
