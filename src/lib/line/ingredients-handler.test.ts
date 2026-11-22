import { beforeEach, describe, it, expect, vi } from 'vitest'
import type { messagingApi } from '@line/bot-sdk'
import { createServerClient } from '@/lib/db/client'
import { handleIngredientsPostback } from './ingredients-handler'
import { RECIPE_NOT_FOUND_TEXT } from './ingredients-messages'

vi.mock('@/lib/db/client', () => ({ createServerClient: vi.fn() }))

const LINE_USER = 'U-line-user'
const USER_ID = 'user-1'

/** users → recipes の順に引かれる Supabase クライアントのモック。recipes への eq を記録する */
function mockSupabase(recipe: unknown) {
  const recipeEq = vi.fn()
  const recipesQuery = {
    select: () => recipesQuery,
    eq: (col: string, val: string) => { recipeEq(col, val); return recipesQuery },
    maybeSingle: async () => ({ data: recipe, error: null }),
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
  beforeEach(() => vi.mocked(createServerClient).mockReset())

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
})
