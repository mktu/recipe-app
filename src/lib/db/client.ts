import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl,
  supabasePublishableKey
)

// サーバーサイド用（Secret Key を使用）- シングルトン
let serverClient: SupabaseClient<Database> | null = null

export function createServerClient(): SupabaseClient<Database> {
  if (serverClient) return serverClient

  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not set')
  }
  serverClient = createClient<Database>(supabaseUrl, secretKey)
  return serverClient
}
