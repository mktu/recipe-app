'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useParseRecipe } from '@/hooks/use-parse-recipe'
import { useCreateRecipe } from '@/hooks/use-create-recipe'
import { RecipeForm, type RecipeFormData } from './recipe-form'
import { PageHeader, CenteredMessage, ErrorMessage } from './ui-parts'
import type { ParsedRecipe } from '@/types/recipe'

function CreateErrorAlert({ error }: { error: Error }) {
  return (
    <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3">
      <p className="text-sm text-destructive">{error.message}</p>
    </div>
  )
}

export function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const url = searchParams.get('url')
  const hasParsedRef = useRef(false)

  const { user, isLoading: authLoading } = useAuth()
  const { parseRecipe, isLoading: parseLoading, error: parseError } = useParseRecipe()
  const { createRecipe, isLoading: createLoading, error: createError } = useCreateRecipe()
  const [parsedData, setParsedData] = useState<ParsedRecipe | null>(null)

  useEffect(() => {
    if (!url || hasParsedRef.current) return
    hasParsedRef.current = true
    parseRecipe(url).then((result) => result && setParsedData(result))
  }, [url, parseRecipe])

  useEffect(() => {
    if (!url) router.replace('/recipes/add')
  }, [url, router])

  const handleBack = useCallback(() => router.push('/recipes/add'), [router])
  const handleRetry = useCallback(() => { hasParsedRef.current = false }, [])

  const handleSubmit = useCallback(async (data: RecipeFormData) => {
    if (!user || !url) return
    const input = { lineUserId: user.lineUserId, url, title: data.title, sourceName: data.sourceName || undefined, imageUrl: data.imageUrl || undefined, ingredientIds: data.ingredientIds, memo: data.memo || undefined }
    const result = await createRecipe(input)
    if (result) router.push('/')
  }, [user, url, createRecipe, router])

  if (authLoading) return <CenteredMessage>読み込み中...</CenteredMessage>
  if (!user) return <CenteredMessage>ログインが必要です</CenteredMessage>
  if (!url) return null

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="レシピを編集" onBack={handleBack} />
      <main className="container mx-auto max-w-2xl p-4">
        {parseLoading ? <CenteredMessage>レシピを解析中...</CenteredMessage> : parseError ? <ErrorMessage error={parseError} onRetry={handleRetry} /> : (
          <>
            {createError && <CreateErrorAlert error={createError} />}
            <RecipeForm url={url} initialValues={parsedData ?? undefined} onSubmit={handleSubmit} onBack={handleBack} isSubmitting={createLoading} />
          </>
        )}
      </main>
    </div>
  )
}
