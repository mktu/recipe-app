import { NextRequest, NextResponse } from 'next/server'
import { apiServerError } from '@/lib/api/error-response'
import { requireLineUser } from '@/lib/api/auth-guard'
import type { SortOrder } from '@/types/recipe'

interface ListRecipesRequest {
  lineUserId: string
  searchQuery?: string
  ingredientIds?: string[]
  sourceNames?: string[]
  sortOrder?: SortOrder
}

/**
 * Edge Function経由でレシピを取得
 * Edge FunctionとDBが同一リージョンにあるため、低レイテンシで実行できる
 */
async function fetchViaEdgeFunction(params: ListRecipesRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/get-recipes`

  const t = Date.now()
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Edge Function error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  console.log('[POST /api/recipes/list] Edge Function call:', Date.now() - t, 'ms')

  return result
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const auth = await requireLineUser(request)
  if (auth instanceof NextResponse) return auth
  const lineUserId = auth

  const body = (await request.json()) as ListRecipesRequest
  const { searchQuery, ingredientIds = [], sourceNames = [], sortOrder = 'newest' } = body

  try {
    const result = await fetchViaEdgeFunction({
      lineUserId,
      searchQuery,
      ingredientIds,
      sourceNames,
      sortOrder,
    })

    console.log('[POST /api/recipes/list] Total:', Date.now() - startTime, 'ms')

    return NextResponse.json(result)
  } catch (err) {
    return apiServerError(err, 'POST /api/recipes/list')
  }
}
