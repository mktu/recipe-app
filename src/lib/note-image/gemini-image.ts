import { NOTE_IMAGE_MODEL } from './constants'

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'

export class GeminiImageError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message)
    this.name = 'GeminiImageError'
  }
}

interface InteractionContent {
  type?: string
  mime_type?: string
  data?: string
}

interface InteractionResponse {
  steps?: { type?: string; content?: InteractionContent[] }[]
}

function findImageData(json: InteractionResponse): string | null {
  for (const step of json.steps ?? []) {
    const image = step.content?.find((c) => c.type === 'image' && c.data)
    if (image?.data) return image.data
  }
  return null
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Gemini（Interactions API）で JPEG の画像を 1 枚作る。
 *
 * 出力形式は `mime_type` で JPEG を指定できるので、変換（sharp）は要らない。
 * 1K の 1:1 で約 1MB。思考（thinking）は API からオフにできないため最小にする。
 * 残高切れは 402 で返る（`docs/OPERATIONS.md`）。呼び出し側はステータスで分岐せず、試行回数として数える
 */
export async function requestNoteImage(prompt: string, apiKey: string): Promise<Uint8Array> {
  const response = await fetch(INTERACTIONS_URL, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: NOTE_IMAGE_MODEL,
      input: prompt,
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '1:1', image_size: '1K' },
      generation_config: { thinking_level: 'minimal' },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new GeminiImageError(`Gemini image API error: ${response.status} - ${body.slice(0, 500)}`, response.status)
  }

  const data = findImageData((await response.json()) as InteractionResponse)
  if (!data) throw new GeminiImageError('Gemini image API returned no image', null)
  return decodeBase64(data)
}
