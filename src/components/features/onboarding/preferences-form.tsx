'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IngredientSuggestInput } from './ingredient-suggest-input'
import { useAuth } from '@/lib/auth'

interface FormState {
  searchKeywords: string[]
  dislikedIngredients: string[]
  maxCookingMinutes: string
}

function usePreferencesForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    searchKeywords: [],
    dislikedIngredients: [],
    maxCookingMinutes: 'none',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || form.searchKeywords.length === 0) return
    setSubmitting(true)
    const maxCookingMinutes = form.maxCookingMinutes === 'none' ? null : parseInt(form.maxCookingMinutes, 10)
    const searchQuery = form.searchKeywords.join(' ')
    try {
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: user.lineUserId,
          preferences: { searchQuery, dislikedIngredients: form.dislikedIngredients, maxCookingMinutes },
        }),
      })
      if (!res.ok) throw new Error('Failed to start')
      setSubmitted(true)
    } catch {
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    if (!user) return
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId: user.lineUserId, selectedCandidates: [] }),
    })
    router.replace('/')
  }

  return { form, setForm, submitting, submitted, handleSubmit, handleSkip, user }
}

function SubmittedView({ lineUserId }: { lineUserId: string | undefined }) {
  const router = useRouter()

  async function handleGoHome() {
    if (!lineUserId) return
    await fetch('/api/onboarding/allow-home', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId }),
    })
    router.replace('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <p className="text-2xl">🍳</p>
        <h2 className="text-lg font-semibold">バックグラウンドで探しています</h2>
        <p className="text-sm text-muted-foreground">
          完了したら LINE でお知らせします！<br />
          見つかったら候補から登録してください。
        </p>
        <Button variant="outline" size="sm" onClick={() => router.replace('/onboarding/result')}>
          結果を確認する
        </Button>
        <div>
          <button type="button" onClick={handleGoHome} className="text-xs text-muted-foreground underline">
            ホームへ戻る
          </button>
        </div>
      </div>
    </div>
  )
}

function PreferencesFormBody({ form, setForm, submitting, onSubmit }: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>好きな食材・料理名 <span className="text-destructive">*</span></Label>
        <IngredientSuggestInput
          value={form.searchKeywords}
          onChange={(v) => setForm((f) => ({ ...f, searchKeywords: v }))}
          placeholder="例: 鶏肉、パスタ、時短…"
        />
        <p className="text-xs text-muted-foreground">候補から選んでください（Enter で先頭候補を追加）</p>
      </div>
      <div className="space-y-2">
        <Label>苦手な食材（任意）</Label>
        <IngredientSuggestInput
          value={form.dislikedIngredients}
          onChange={(v) => setForm((f) => ({ ...f, dislikedIngredients: v }))}
          placeholder="例: セロリ、パクチー…"
        />
      </div>
      <div className="space-y-2">
        <Label>調理時間の希望</Label>
        <Select value={form.maxCookingMinutes} onValueChange={(v) => setForm((f) => ({ ...f, maxCookingMinutes: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">制限なし</SelectItem>
            <SelectItem value="30">30分以内</SelectItem>
            <SelectItem value="20">20分以内</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={submitting || form.searchKeywords.length === 0}>
        {submitting ? '送信中…' : 'レシピを探してもらう'}
      </Button>
    </form>
  )
}

export function PreferencesForm() {
  const { form, setForm, submitting, submitted, handleSubmit, handleSkip, user } = usePreferencesForm()

  if (submitted) return <SubmittedView lineUserId={user?.lineUserId} />

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold">好みを教えてください</h1>
          <p className="text-sm text-muted-foreground">あなた向けのレシピを探します</p>
        </div>
        <PreferencesFormBody form={form} setForm={setForm} submitting={submitting} onSubmit={handleSubmit} />
        <div className="text-center">
          <button type="button" onClick={handleSkip} className="text-xs text-muted-foreground underline">
            スキップして始める
          </button>
        </div>
      </div>
    </div>
  )
}
