import { beforeEach, describe, it, expect, vi } from 'vitest'
import type { messagingApi } from '@line/bot-sdk'
import { createServerClient } from '@/lib/db/client'
import { recordRecipeView } from '@/lib/db/queries/recipes'
import { handleIngredientsPostback } from './ingredients-handler'
import { RECIPE_NOT_FOUND_TEXT } from './ingredients-messages'

vi.mock('@/lib/db/client', () => ({ createServerClient: vi.fn() }))
vi.mock('@/lib/db/queries/recipes', () => ({ recordRecipeView: vi.fn() }))

const LINE_USER = 'U-line-user'
const USER_ID = 'user-1'

/** users → recipes の順に引かれる Supabase クライアントのモック。recipes への eq を記録する */
function mockSupabase(recipe: unknown, error: { code: string } | null = null) {
  const recipeEq = vi.fn()
  const recipesQuery = {
    select: () => recipesQuery,
    eq: (col: string, val: string) => { recipeEq(col, val); return recipesQuery },
    maybeSingle: async () => ({ data: recipe, error }),
  }
  const usersQuery = {
    select: () => usersQuery,
    eq: () => usersQuery,
    single: async () => ({ data: { id: USER_ID } }),
  }
  vi.mocked(createServerClient).mockReturnValue({
    from: (table: string) => (table === 'users' ? usersQuery : recipesQuery),
  } as unknown as ReturnType<typeof createServerClient>)
  return recipeEq
}

function createClient() {
  return { replyMessage: vi.fn().mockResolvedValue({}) }
}

const run = (client: ReturnType<typeof createClient>) =>
  handleIngredientsPostback(client as unknown as messagingApi.MessagingApiClient, 'token', LINE_USER, 'r1')

describe('handleIngredientsPostback', () => {
  beforeEach(() => {
    vi.mocked(createServerClient).mockReset()
    vi.mocked(recordRecipeView).mockReset()
    vi.mocked(recordRecipeView).mockResolvedValue(undefined)
  })

  it('recipeId だけでなく user_id でも絞って取得する（postback の data は改ざんされうる）', async () => {
    const recipeEq = mockSupabase({ id: 'r1', title: '親子丼', url: 'https://example.com/r', ingredients_raw: [] })
    await run(createClient())
    expect(recipeEq).toHaveBeenCalledWith('id', 'r1')
    expect(recipeEq).toHaveBeenCalledWith('user_id', USER_ID)
  })

  it('材料をテキストで返す', async () => {
    mockSupabase({ id: 'r1', title: '親子丼', url: 'https://example.com/r', ingredients_raw: [{ name: '卵', amount: '2個' }] })
    const client = createClient()
    await run(client)
    expect(client.replyMessage.mock.calls[0][0].messages[0].text).toContain('・卵 2個')
  })

  it('見つからなければ（他人のレシピも含む）その旨を返す', async () => {
    mockSupabase(null)
    const client = createClient()
    await run(client)
    expect(client.replyMessage.mock.calls[0][0].messages[0].text).toBe(RECIPE_NOT_FOUND_TEXT)
  })

  it('ingredients_raw の形式が崩れていても落ちない（文字列は名前として出し、null は捨てる）', async () => {
    mockSupabase({ id: 'r1', title: '親子丼', url: 'https://example.com/r', ingredients_raw: ['鶏もも肉 300g', null, { name: '卵' }] })
    const client = createClient()
    await run(client)
    expect(client.replyMessage.mock.calls[0][0].messages[0].text).toBe('親子丼 の材料\n・鶏もも肉 300g\n・卵')
  })

  it('UUID でない recipeId（改ざんされた data）は「見つからない」として返す', async () => {
    mockSupabase(null, { code: '22P02' })
    const client = createClient()
    await run(client)
    expect(client.replyMessage.mock.calls[0][0].messages[0].text).toBe(RECIPE_NOT_FOUND_TEXT)
  })

  it('それ以外の DB エラーは「削除された」と案内せず、エラーとして返す', async () => {
    mockSupabase(null, { code: '57014' })
    const client = createClient()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await run(client)
    expect(client.replyMessage.mock.calls[0][0].messages[0].text).not.toBe(RECIPE_NOT_FOUND_TEXT)
  })

  it('材料を返したら、閲覧として記録する', async () => {
    mockSupabase({ id: 'r1', title: '親子丼', url: 'https://example.com/r', ingredients_raw: [] })
    await run(createClient())
    expect(recordRecipeView).toHaveBeenCalledWith('r1')
  })

  it('見つからなかったレシピ（他人のレシピも含む）は記録しない', async () => {
    mockSupabase(null)
    await run(createClient())
    expect(recordRecipeView).not.toHaveBeenCalled()
  })

  it('記録に失敗しても、材料の返信は済んでいてエラー返信はしない', async () => {
    mockSupabase({ id: 'r1', title: '親子丼', url: 'https://example.com/r', ingredients_raw: [] })
    vi.mocked(recordRecipeView).mockRejectedValue(new Error('db down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = createClient()
    await run(client)
    expect(client.replyMessage).toHaveBeenCalledTimes(1)
  })
})
