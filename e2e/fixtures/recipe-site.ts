import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * E2E 用のローカルレシピサイト。
 *
 * 確認画面の `parseRecipe()` は **Next.js のサーバー側**で走る
 * （`src/app/(protected)/recipes/add/confirm/page.tsx`）。ブラウザからの通信ではないので
 * `page.route()` ではインターセプトできない。そこで実際に HTTP を張れる相手をこちらで立て、
 * JSON-LD 抽出 → 食材マッチングまで本物の経路を通す。
 *
 * 外部のレシピサイトへは E2E からは一切アクセスしない（`docs/SCRAPING_POLICY.md`）。
 */

/** JSON-LD を持つレシピページ。追加フローの正常系で使う */
export const FIXTURE_RECIPE = {
  path: '/recipes/e2e-nasu-shogayaki',
  title: 'なすと鶏もも肉の生姜焼き',
  sourceName: 'E2E レシピサイト',
  imageUrl: 'https://example.com/e2e-shogayaki.jpg',
  cookingTimeMinutes: 25,
  ingredientLines: ['鶏もも肉 300g', 'なす 2本', 'たまねぎ 1/2個', '醤油 大さじ2'],
  /**
   * 上記のうち食材マスタに解決され、確認画面にバッジとして出るもの。
   * 醤油は調味料判定でスキップされる（`src/lib/recipe/seasonings.ts`）。
   */
  matchedIngredientNames: ['鶏もも肉', 'なす', 'たまねぎ'],
} as const

function recipeHtml(): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: FIXTURE_RECIPE.title,
    image: FIXTURE_RECIPE.imageUrl,
    publisher: { '@type': 'Organization', name: FIXTURE_RECIPE.sourceName },
    cookTime: `PT${FIXTURE_RECIPE.cookingTimeMinutes}M`,
    recipeIngredient: [...FIXTURE_RECIPE.ingredientLines],
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${FIXTURE_RECIPE.title}</title>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body><h1>${FIXTURE_RECIPE.title}</h1></body>
</html>`
}

export interface RecipeSite {
  /** 例: `http://127.0.0.1:53211` */
  origin: string
  /** fixture レシピの絶対 URL */
  recipeUrl: string
  close: () => Promise<void>
}

/** ローカルレシピサイトを空きポートで起動する */
export async function startRecipeSite(): Promise<RecipeSite> {
  const server: Server = createServer((req, res) => {
    if (req.url === FIXTURE_RECIPE.path) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(recipeHtml())
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const origin = `http://127.0.0.1:${port}`

  return {
    origin,
    recipeUrl: `${origin}${FIXTURE_RECIPE.path}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    }),
  }
}
