import type { ParsedRecipe } from '@/types/recipe'

/**
 * URLからドメイン名を抽出
 */
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    const domain = hostname.replace(/^www\./, '')
    const name = domain.split('.')[0]
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return ''
  }
}

/**
 * URLからレシピ情報を解析する（現在はスタブ実装）
 *
 * 将来の実装:
 * 1. Jina Reader でURLからコンテンツ取得
 * 2. Gemini で構造化データ抽出
 * 3. 食材名を ingredient_aliases で正規化
 */
export async function parseRecipe(url: string): Promise<ParsedRecipe> {
  // スタブ実装: 空データを返す（sourceNameのみURLから抽出）
  return {
    title: '',
    sourceName: extractDomainName(url),
    imageUrl: '',
    ingredientIds: [],
    memo: '',
  }
}
