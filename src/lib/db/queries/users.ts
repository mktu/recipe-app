import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

/** LINE ユーザー ID から内部の users.id を引く */
export async function getUserIdByLineUserId(
  client: TypedSupabaseClient,
  lineUserId: string
): Promise<string | null> {
  const { data, error } = await client.from('users').select('id').eq('line_user_id', lineUserId).single()
  return error || !data ? null : data.id
}
