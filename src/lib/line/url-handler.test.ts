import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { messagingApi } from '@line/bot-sdk'
import { processUrl } from './url-handler'
import { parseRecipe } from '@/lib/recipe/parse-recipe'
import { createRecipe } from '@/lib/db/queries/recipes'

vi.mock('@/lib/recipe/parse-recipe', () => ({ parseRecipe: vi.fn() }))
vi.mock('@/lib/db/queries/recipes', () => ({ createRecipe: vi.fn() }))
vi.mock('@/lib/db/client', () => ({ createServerClient: vi.fn() }))

const APP_URL = 'https://recipe.example.com'
const USER = 'U-line-user'

function createClient() {
  return { replyMessage: vi.fn().mockResolvedValue({}) }
}

const run = (client: ReturnType<typeof createClient>, url: string, ensureUser = vi.fn().mockResolvedValue(undefined)) =>
  processUrl(client as unknown as messagingApi.MessagingApiClient, 'token', USER, url, ensureUser)

const repliedText = (client: ReturnType<typeof createClient>) =>
  client.replyMessage.mock.calls[0][0].messages[0].text as string

describe('processUrl', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
    vi.mocked(parseRecipe).mockReset()
    vi.mocked(createRecipe).mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // #230: 取得するとアプリ全体の OGP が返り、中身の無いレシピが登録されていた
  it('アプリ自身の URL は登録せず、案内を返す', async () => {
    const client = createClient()
    const ensureUser = vi.fn()
    await run(client, `${APP_URL}/notes/abc-123`, ensureUser)

    expect(repliedText(client)).toBe('RecipeHub のページは登録できません。レシピサイトの URL を送ってください。')
    expect(parseRecipe).not.toHaveBeenCalled()
    expect(createRecipe).not.toHaveBeenCalled()
    expect(ensureUser).not.toHaveBeenCalled()
  })

  it('LIFF の URL も登録しない', async () => {
    const client = createClient()
    await run(client, 'https://liff.line.me/1234567890-abcdefgh/notes/1')

    expect(repliedText(client)).toContain('RecipeHub のページは登録できません')
    expect(createRecipe).not.toHaveBeenCalled()
  })

  it('外部サイトの URL はこれまでどおり登録する', async () => {
    vi.mocked(parseRecipe).mockResolvedValue({ title: '肉じゃが' } as Awaited<ReturnType<typeof parseRecipe>>)
    vi.mocked(createRecipe).mockResolvedValue({ error: null } as Awaited<ReturnType<typeof createRecipe>>)
    const client = createClient()
    await run(client, 'https://cookpad.com/recipe/123')

    expect(createRecipe).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://cookpad.com/recipe/123', title: '肉じゃが' }))
    expect(repliedText(client)).toContain('レシピを保存しました')
  })
})
