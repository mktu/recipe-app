/**
 * マイレシピの AI 画像（#287）の定数
 *
 * Edge Function `generate-note-images` にもビルドでコピーされる（`scripts/build-edge-functions.ts`）。
 * このフォルダのファイルは相互に相対パスで import し、`@/` を使わないこと（Deno 側で解決できない）
 */

/** AI 画像専用の公開バケット。写真（#223）は載せない */
export const NOTE_IMAGE_BUCKET = 'generated-images'

export const NOTE_IMAGE_MODEL = 'gemini-nano-banana-2.1'

/**
 * 1 ノートあたりの試行回数の上限。
 * `claim_note_image_generations` の既定値と、cron の onlyIf（`scripts/setup-cron.ts`）と揃える
 */
export const NOTE_IMAGE_MAX_ATTEMPTS = 3

/** 1 ユーザーあたりの月の上限（JST の暦月）。`claim_note_image_generations` の既定値と揃える */
export const NOTE_IMAGE_MONTHLY_LIMIT = 30

/** 1 回の呼び出しで生成する最大件数。1 枚に十数秒かかるので、Edge Function の実行時間に収まる数にする */
export const NOTE_IMAGE_BATCH_LIMIT = 5
