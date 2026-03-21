/**
 * E2E テスト用のモックレスポンスデータ。
 * page.route() でインターセプトする際に使用する。
 */

/** オンボーディング候補レシピ（Edge Function のスクレイピング結果を模倣） */
export const MOCK_ONBOARDING_CANDIDATES = [
  {
    url: 'https://delishkitchen.tv/recipes/e2e-candidate-1',
    title: '鶏の唐揚げ',
    imageUrl: 'https://example.com/karaage.jpg',
    cookingTimeMinutes: 20,
    siteName: 'DELISH KITCHEN',
    ingredientsRaw: [
      { name: '鶏もも肉', amount: '300g' },
      { name: '醤油', amount: '大さじ2' },
      { name: '生姜', amount: '1片' },
    ],
  },
  {
    url: 'https://www.kurashiru.com/recipes/e2e-candidate-2',
    title: '豚肉の生姜焼き',
    imageUrl: 'https://example.com/shogayaki.jpg',
    cookingTimeMinutes: 15,
    siteName: 'クラシル',
    ingredientsRaw: [
      { name: '豚ロース肉', amount: '200g' },
      { name: '生姜', amount: '1片' },
    ],
  },
]

/** /api/onboarding/result のレスポンス（pending 状態） */
export const MOCK_ONBOARDING_RESULT_PENDING = {
  session: {
    id: 'e2e-session-001',
    status: 'pending',
    candidates: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
}

/** /api/onboarding/result のレスポンス（completed 状態） */
export const MOCK_ONBOARDING_RESULT_COMPLETED = {
  session: {
    id: 'e2e-session-001',
    status: 'completed',
    candidates: MOCK_ONBOARDING_CANDIDATES,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
}

/** /api/onboarding/result のレスポンス（failed 状態） */
export const MOCK_ONBOARDING_RESULT_FAILED = {
  session: {
    id: 'e2e-session-001',
    status: 'failed',
    candidates: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
}

/** /api/recipes/parse のレスポンス（URL からのレシピ解析結果） */
export const MOCK_RECIPE_PARSE_RESULT = {
  title: 'テスト鶏の唐揚げ',
  sourceName: 'DELISH KITCHEN',
  imageUrl: 'https://example.com/karaage.jpg',
  cookingTimeMinutes: 20,
  ingredientIds: [],
  ingredientsRaw: [
    { name: '鶏もも肉', amount: '300g' },
    { name: '醤油', amount: '大さじ2' },
  ],
}
