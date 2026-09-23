/**
 * レシピノートのプレースホルダー画像（Issue #174）
 *
 * 実体は `public/placeholders/<key>.png`（`npm run generate:placeholders` で生成。
 * 候補を足すときは `scripts/generate-placeholder-images.ts` にアイコンも描く）。ノートは `recipe_notes.image_key` に key を持ち、
 * 図鑑側の `recipes.image_url` には RPC がこのパスを書き込む（表示側は image_url だけを読む）。
 *
 * **パスの規則は SQL 側と二重に持っている。** `create_recipe_note` / `update_recipe_note` が
 * `'/placeholders/' || image_key || '.png'` を組み立てるので、規則を変えるときは migration も要る
 * （`supabase/migrations/20260923000000_set_note_image_url.sql`）。
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

/**
 * 画像を持たないレシピ用の「NO IMAGE」画像（お皿の線画）。LINE Flex は hero に画像 URL が必須なので、
 * その穴埋めに使う。無地だと読み込み失敗と区別がつかないため、画像が無いことが伝わる絵にしている。
 * ノートで選べる候補には含めない（料理ジャンルを誤解させないため）
 */
export const FALLBACK_IMAGE_PATH = '/placeholders/default.png'

export function placeholderImagePath(key: PlaceholderImageKey): string {
  return `/placeholders/${key}.png`
}

export function isPlaceholderImageKey(value: unknown): value is PlaceholderImageKey {
  return PLACEHOLDER_IMAGES.some((image) => image.key === value)
}
