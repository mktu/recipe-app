import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseRecipe } from './parse-recipe'
import { fetchHtml, HtmlFetchError } from '@/lib/scraper/html-fetcher'

vi.mock('@/lib/scraper/html-fetcher', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/scraper/html-fetcher')>()),
  fetchHtml: vi.fn(),
}))
vi.mock('./match-ingredients', () => ({ matchIngredients: vi.fn().mockResolvedValue([]) }))

const URL_ = 'https://example.com/recipe/1'

function html(head: string): { html: string; contentType: string } {
  return { html: `<!DOCTYPE html><html><head>${head}</head><body></body></html>`, contentType: 'text/html' }
}

function jsonLd(recipe: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Recipe', ...recipe })}</script>`
}

describe('parseRecipe', () => {
  beforeEach(() => {
    vi.mocked(fetchHtml).mockReset()
  })

  // #242: 存在しないホスト（DNS 解決不可）や 404 でも、空の結果で登録できてしまっていた
  it('取得に失敗したら null を返す', async () => {
    vi.mocked(fetchHtml).mockRejectedValue(new HtmlFetchError('getaddrinfo ENOTFOUND kikkoman.co.jp'))
    expect(await parseRecipe(URL_)).toBeNull()
  })

  it('ボット拒否（403）でも null を返す', async () => {
    vi.mocked(fetchHtml).mockRejectedValue(new HtmlFetchError('HTTP 403', 403, true))
    expect(await parseRecipe(URL_)).toBeNull()
  })

  it('タイトルが取れなければ null を返す', async () => {
    vi.mocked(fetchHtml).mockResolvedValue(html(''))
    expect(await parseRecipe(URL_)).toBeNull()
  })

  it('タイトルだけ取れれば、ほかの情報が無くても結果を返す', async () => {
    vi.mocked(fetchHtml).mockResolvedValue(html('<title>肉じゃが</title>'))
    const result = await parseRecipe(URL_)
    expect(result?.title).toBe('肉じゃが')
    expect(result?.ingredientIds).toEqual([])
  })

  it('JSON-LD に name が無ければ JSON-LD は使わず、<title> で登録する', async () => {
    vi.mocked(fetchHtml).mockResolvedValue(html(`<title>肉じゃが</title>${jsonLd({ recipeIngredient: ['じゃがいも 2個'] })}`))
    const result = await parseRecipe(URL_)
    expect(result?.title).toBe('肉じゃが')
    expect(result?.ingredientsRaw).toEqual([])
  })

  it('JSON-LD の name があればそれを使う', async () => {
    vi.mocked(fetchHtml).mockResolvedValue(html(`<title>サイト名</title>${jsonLd({ name: '肉じゃが', recipeIngredient: ['じゃがいも 2個'] })}`))
    expect((await parseRecipe(URL_))?.title).toBe('肉じゃが')
  })
})
