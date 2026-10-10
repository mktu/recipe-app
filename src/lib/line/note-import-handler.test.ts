import { beforeEach, describe, it, expect, vi } from 'vitest'
import type { messagingApi } from '@line/bot-sdk'
import { handleRecipeNoteImport } from './note-import-handler'
import { saveRecipeNote } from '@/lib/recipe/save-recipe-note'

vi.mock('@/lib/recipe/save-recipe-note', () => ({ saveRecipeNote: vi.fn() }))

const MARKDOWN = '[レシピ入力]\n# 冷奴\n## 材料\n- 豆腐 1丁\n## 手順\n1. 切る\n[ここまで]'
const USER = 'U-line-user'

function createClient() {
  return {
    replyMessage: vi.fn().mockResolvedValue({}),
    pushMessage: vi.fn().mockResolvedValue({}),
  }
}

const run = (client: ReturnType<typeof createClient>, text = MARKDOWN) =>
  handleRecipeNoteImport(client as unknown as messagingApi.MessagingApiClient, 'token', USER, text, vi.fn().mockResolvedValue(undefined))

describe('handleRecipeNoteImport', () => {
  beforeEach(() => {
    vi.mocked(saveRecipeNote).mockReset()
    vi.mocked(saveRecipeNote).mockResolvedValue({ data: { noteId: 'n1', recipeId: 'r1' }, error: null })
  })

  it('登録して、結果を reply で返す', async () => {
    const client = createClient()
    await run(client)
    expect(saveRecipeNote).toHaveBeenCalledWith(USER, expect.objectContaining({ title: '冷奴' }))
    expect(client.replyMessage).toHaveBeenCalledTimes(1)
    expect(client.pushMessage).not.toHaveBeenCalled()
  })

  it('登録後の reply が失敗したら、「登録はできた」を push で伝える（失敗した replyToken は再利用できない）', async () => {
    const client = createClient()
    client.replyMessage.mockRejectedValueOnce(new Error('400 Bad Request'))
    await run(client)

    expect(client.replyMessage).toHaveBeenCalledTimes(1)
    expect(client.pushMessage).toHaveBeenCalledWith({
      to: USER,
      messages: [{ type: 'text', text: expect.stringContaining('登録しました') }],
    })
  })

  it('push も失敗したら投げずに終わる（webhook を 500 にしない）', async () => {
    const client = createClient()
    client.replyMessage.mockRejectedValueOnce(new Error('400 Bad Request'))
    client.pushMessage.mockRejectedValueOnce(new Error('quota'))
    await expect(run(client)).resolves.toBeUndefined()
  })

  it('保存に失敗したら、登録できなかったことを reply で返す', async () => {
    vi.mocked(saveRecipeNote).mockResolvedValue({ data: null, error: { message: 'db down' } })
    const client = createClient()
    await run(client)

    const [[{ messages }]] = client.replyMessage.mock.calls
    expect(messages[0].text).toContain('登録に失敗しました')
    expect(client.pushMessage).not.toHaveBeenCalled()
  })

  it('最低条件を満たさなければ保存せず、理由を返す', async () => {
    const client = createClient()
    await run(client, '[レシピ入力]\n# 冷奴\n## 手順\n1. 切る\n[ここまで]')

    expect(saveRecipeNote).not.toHaveBeenCalled()
    const [[{ messages }]] = client.replyMessage.mock.calls
    expect(messages[0].text).toContain('材料がありません')
  })
})
