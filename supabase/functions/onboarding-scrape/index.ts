/**
 * オンボーディング スクレイピング Edge Function
 *
 * POST body: { sessionId: string }
 *
 * 処理:
 * 1. onboarding_sessions から preferences を取得
 * 2. DELISH KITCHEN + Nadia を並列スクレイピング
 * 3. フィルタリング（苦手食材・調理時間）
 * 4. セッションに candidates を保存
 * 5. LINE push 通知を送信
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const TIMEOUT_MS = 15000
const MAX_RESULTS_PER_SITE = 5

const SITES = {
  delishkitchen: {
    searchUrl: (q: string) => `https://delishkitchen.tv/search?q=${encodeURIComponent(q)}`,
    urlPattern: /https:\/\/delishkitchen\.tv\/recipes\/\d+/g,
    urlPrefix: '',
  },
  nadia: {
    searchUrl: (q: string) => `https://oceans-nadia.com/search?keyword=${encodeURIComponent(q)}`,
    urlPattern: /\/user\/\d+\/recipe\/\d+/g,
    urlPrefix: 'https://oceans-nadia.com',
  },
}

interface Preferences {
  searchQuery: string
  dislikedIngredients: string[]
  maxCookingMinutes: number | null
}

interface RecipeCandidate {
  url: string
  title: string
  imageUrl: string
  cookingTimeMinutes: number | null
  ingredientsRaw: { name: string; amount: string }[]
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(tid)
  }
}

function extractUrlsFromHtml(html: string, pattern: RegExp, prefix: string): string[] {
  const matches = html.match(pattern) ?? []
  return [...new Set(matches)].map((u) => `${prefix}${u}`)
}

function parseIso8601Duration(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(v)
  if (!m) return null
  const total = (parseInt(m[1] ?? '0') * 60) + parseInt(m[2] ?? '0') + Math.round(parseInt(m[3] ?? '0') / 60)
  return total > 0 ? total : null
}

function extractImageUrl(image: unknown): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  if (Array.isArray(image)) {
    const first = image[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && 'url' in first) return String((first as Record<string, unknown>).url ?? '')
    return ''
  }
  if (typeof image === 'object' && 'url' in image) return String((image as Record<string, unknown>).url ?? '')
  return ''
}

function extractJsonLdRecipe(html: string, sourceUrl: string): RecipeCandidate | null {
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = pattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const recipe = findRecipeInJsonLd(data)
      if (recipe) {
        const cookTime = parseIso8601Duration(recipe.cookTime) ?? parseIso8601Duration(recipe.totalTime)
        const ingredients: string[] = Array.isArray(recipe.recipeIngredient)
          ? recipe.recipeIngredient.filter((i: unknown) => typeof i === 'string')
          : []
        return {
          url: sourceUrl,
          title: recipe.name,
          imageUrl: extractImageUrl(recipe.image),
          cookingTimeMinutes: cookTime ?? null,
          ingredientsRaw: ingredients.map((name: string) => ({ name, amount: '' })),
        }
      }
    } catch { /* skip */ }
  }
  return null
}

function findRecipeInJsonLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const r = findRecipeInJsonLd(item)
      if (r) return r
    }
    return null
  }
  const obj = data as Record<string, unknown>
  if (isRecipeType(obj['@type']) && typeof obj['name'] === 'string') return obj
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const r = findRecipeInJsonLd(item)
      if (r) return r
    }
  }
  return null
}

function isRecipeType(t: unknown): boolean {
  if (t === 'Recipe') return true
  if (Array.isArray(t) && t.includes('Recipe')) return true
  return false
}

function extractNextDataRecipe(html: string, sourceUrl: string): RecipeCandidate | null {
  const m = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i.exec(html)
  if (!m?.[1]) return null
  try {
    const data = JSON.parse(m[1]) as Record<string, unknown>
    const props = data['props'] as Record<string, unknown> | undefined
    const pageProps = props?.['pageProps'] as Record<string, unknown> | undefined
    const recipe = (pageProps?.['data'] as Record<string, unknown> | undefined)?.['publishedRecipe'] as Record<string, unknown> | undefined
    if (!recipe?.['title'] || typeof recipe['title'] !== 'string') return null

    const ingredients = Array.isArray(recipe['ingredients'])
      ? (recipe['ingredients'] as Array<Record<string, unknown>>)
          .map((i) => ({ name: String(i['name'] ?? '').replace(/\s*[\(（].*?[\)）]\s*$/, '').trim(), amount: String(i['amount'] ?? '') }))
          .filter((i) => i.name.length > 0)
      : []

    const imageSet = Array.isArray(recipe['imageSet']) ? recipe['imageSet'] as Array<Record<string, unknown>> : []
    const rawPath = imageSet[0]?.['path']
    const imagePath = typeof rawPath === 'string' ? rawPath : ''
    const imageUrl = imagePath.startsWith('http') ? imagePath : `https://asset.oceans-nadia.com${imagePath}`

    return {
      url: sourceUrl,
      title: recipe['title'],
      imageUrl,
      cookingTimeMinutes: typeof recipe['cookTime'] === 'number' ? recipe['cookTime'] : null,
      ingredientsRaw: ingredients,
    }
  } catch { return null }
}

async function scrapeRecipeUrl(url: string): Promise<RecipeCandidate | null> {
  try {
    const html = await fetchHtml(url)
    return extractJsonLdRecipe(html, url) ?? extractNextDataRecipe(html, url)
  } catch { return null }
}

async function scrapeSite(siteKey: keyof typeof SITES, query: string): Promise<RecipeCandidate[]> {
  const site = SITES[siteKey]
  try {
    const html = await fetchHtml(site.searchUrl(query))
    const urls = extractUrlsFromHtml(html, site.urlPattern, site.urlPrefix).slice(0, MAX_RESULTS_PER_SITE)
    const results = await Promise.all(urls.map(scrapeRecipeUrl))
    return results.filter((r): r is RecipeCandidate => r !== null)
  } catch (e) {
    console.error(`[onboarding-scrape] ${siteKey} failed:`, e)
    return []
  }
}

function filterCandidates(candidates: RecipeCandidate[], prefs: Preferences): RecipeCandidate[] {
  return candidates.filter((c) => {
    if (prefs.maxCookingMinutes != null && c.cookingTimeMinutes != null) {
      if (c.cookingTimeMinutes > prefs.maxCookingMinutes) return false
    }
    if (prefs.dislikedIngredients.length > 0) {
      const ingredientNames = c.ingredientsRaw.map((i) => i.name.toLowerCase())
      for (const disliked of prefs.dislikedIngredients) {
        if (ingredientNames.some((n) => n.includes(disliked.toLowerCase()))) return false
      }
    }
    return true
  })
}

async function sendLineNotification(lineUserId: string, candidateCount: number, appUrl: string): Promise<void> {
  const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
  if (!token) {
    console.warn('[onboarding-scrape] LINE_CHANNEL_ACCESS_TOKEN not set')
    return
  }

  const resultUrl = `${appUrl}/onboarding/result`

  const message = candidateCount > 0
    ? {
        type: 'flex',
        altText: `${candidateCount}件のレシピが見つかりました！`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🍳 レシピが見つかりました！', weight: 'bold', size: 'md' },
              { type: 'text', text: `${candidateCount}件のレシピ候補があります。`, size: 'sm', color: '#666666', margin: 'md' },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                action: { type: 'uri', label: '確認する', uri: resultUrl },
              },
            ],
          },
        },
      }
    : { type: 'text', text: '申し訳ありません。レシピが見つかりませんでした。\n別のキーワードでお試しください。' }

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: lineUserId, messages: [message] }),
  })
}

async function scrapeAndNotify(sessionId: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const appUrl = Deno.env.get('APP_URL') ?? 'https://localhost:3000'

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: session, error: fetchError } = await supabase
    .from('onboarding_sessions')
    .select('user_id, preferences')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    console.error('[onboarding-scrape] Session not found:', fetchError)
    return
  }

  const prefs = session.preferences as unknown as Preferences

  try {
    const [delish, nadia] = await Promise.all([
      scrapeSite('delishkitchen', prefs.searchQuery),
      scrapeSite('nadia', prefs.searchQuery),
    ])

    const all = filterCandidates([...delish, ...nadia], prefs)
    console.log(`[onboarding-scrape] Done: delish=${delish.length}, nadia=${nadia.length}, filtered=${all.length}`)

    // deno-lint-ignore no-explicit-any
    await supabase
      .from('onboarding_sessions')
      .update({ candidates: all as unknown as any, status: 'completed' })
      .eq('id', sessionId)

    await sendLineNotification(session.user_id, all.length, appUrl)
  } catch (e) {
    console.error('[onboarding-scrape] Failed:', e)
    await supabase.from('onboarding_sessions').update({ status: 'failed' }).eq('id', sessionId)
    await sendLineNotification(session.user_id, 0, appUrl)
  }
}

Deno.serve(async (req) => {
  const { sessionId } = await req.json() as { sessionId: string }

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 })
  }

  EdgeRuntime.waitUntil(scrapeAndNotify(sessionId))

  return new Response(JSON.stringify({ status: 'processing' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
