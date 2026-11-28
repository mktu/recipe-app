/**
 * レシピノートのプレースホルダー画像（Issue #174）
 *
 * 実体は `public/placeholders/<key>.png`（`npm run generate:placeholders` で生成。
 * 候補を足すときは `scripts/generate-placeholder-images.ts` にアイコンも描く）。ノートは `recipe_notes.image_key` に key を持ち、
 * 図鑑側の `recipes.image_url` には RPC が `'/placeholders/' || image_key || '.png'` を書き込む
 * （`note_placeholder_image_url`。表示側は image_url だけを読む）。ファイル名を変えるときは migration も要る。
 *
 * 新しく選ぶ画面は無い（#287 で AI 画像に置き換えた）。既に選んであるノートのために残している（#292 で片付ける）
 */
export const PLACEHOLDER_IMAGES = [
  { key: 'japanese', label: '和食' },
  { key: 'western', label: '洋食' },
  { key: 'chinese', label: '中華' },
  { key: 'noodle', label: '麺' },
  { key: 'soup', label: 'スープ' },
  { key: 'salad', label: 'サラダ' },
  { key: 'dessert', label: 'デザート' },
] as const

export type PlaceholderImageKey = (typeof PLACEHOLDER_IMAGES)[number]['key']

export function isPlaceholderImageKey(value: unknown): value is PlaceholderImageKey {
  return PLACEHOLDER_IMAGES.some((image) => image.key === value)
}
