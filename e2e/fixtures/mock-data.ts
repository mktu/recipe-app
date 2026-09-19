/**
 * E2E テスト用のモックレスポンスデータ。
 * page.route() でインターセプトする際に使用する。
 */

/**
 * `/api/recipes/parse` のレスポンス（レシピ詳細の再取得ボタン用）。
 * 呼び出し元は `src/components/features/recipe-detail/use-rescrape.ts`（Issue #39 で使う）。
 *
 * 追加フローの解析はここではモックできない。確認画面の `parseRecipe()` は
 * サーバー側で走るため、ローカルの fixture サイト（`./recipe-site.ts`）を相手にする。
 */
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
