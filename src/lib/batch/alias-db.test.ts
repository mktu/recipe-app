import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertNewIngredient } from './alias-db'

/**
 * insert().select().single() の戻り値だけを差し替えた最小のモッククライアント。
 * insert に渡されたペイロードを検証できるよう spy を返す。
 */
function createMockClient(response: { data: unknown; error: unknown }) {
  const insert = vi.fn(() => ({
    select: () => ({ single: async () => response }),
  }))
  const client = { from: () => ({ insert }) } as unknown as SupabaseClient
  return { client, insert }
}

describe('insertNewIngredient', () => {
  it('needs_review=false / auto_generated=true で登録する', async () => {
    const { client, insert } = createMockClient({ data: { id: 'ing-1' }, error: null })

    const result = await insertNewIngredient(client, '厚揚げ', '豆腐・大豆製品')

    expect(result).toEqual({ id: 'ing-1', error: null })
    expect(insert).toHaveBeenCalledWith({
      name: '厚揚げ',
      category: '豆腐・大豆製品',
      needs_review: false,
      auto_generated: true,
    })
  })

  it('未知のカテゴリはデフォルト（その他）に落とす', async () => {
    const { client, insert } = createMockClient({ data: { id: 'ing-2' }, error: null })

    await insertNewIngredient(client, '謎の食材', '存在しないカテゴリ')

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'その他' })
    )
  })

  it('重複（23505）をエラーとして返す', async () => {
    // マスタに既にある食材が未マッチとして再来したケース。
    // 黙って握り潰すとバッチ結果に出ず、マッチャーの取りこぼしに気付けない（Issue #148）
    const { client } = createMockClient({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })

    const result = await insertNewIngredient(client, '唐辛子', '野菜')

    expect(result.id).toBeNull()
    expect(result.error).toContain('唐辛子')
  })

  it('その他の DB エラーもエラーとして返す', async () => {
    const { client } = createMockClient({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    })

    const result = await insertNewIngredient(client, 'サラダチキン', '肉')

    expect(result.id).toBeNull()
    expect(result.error).toContain('サラダチキン')
  })
})
