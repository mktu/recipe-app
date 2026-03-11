'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/auth'

interface RecipeCandidate {
  url: string
  title: string
  imageUrl: string
  cookingTimeMinutes: number | null
  ingredientsRaw: { name: string; amount: string }[]
}

interface OnboardingSession {
  id: string
  status: string
  candidates: RecipeCandidate[] | null
  expiresAt: string | null
}

type SessionState = OnboardingSession | null | undefined

const POLL_INTERVAL_MS = 3000

function useOnboardingSession(lineUserId: string | undefined) {
  const [session, setSession] = useState<SessionState>(undefined)

  useEffect(() => {
    if (!lineUserId) return
    const load = async () => {
      const res = await fetch(`/api/onboarding/result?lineUserId=${lineUserId}`)
      const data = await res.json() as { session: OnboardingSession | null }
      setSession(data.session)
    }
    load()
  }, [lineUserId])

  useEffect(() => {
    if (!lineUserId || !session || session.status !== 'pending') return
    const timer = setInterval(() => {
      const poll = async () => {
        const res = await fetch(`/api/onboarding/result?lineUserId=${lineUserId}`)
        const data = await res.json() as { session: OnboardingSession | null }
        setSession(data.session)
      }
      poll()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [lineUserId, session])

  return session
}

export function RecipeCandidates() {
  const { user } = useAuth()
  const router = useRouter()
  const session = useOnboardingSession(user?.lineUserId)
  // null = not yet customized (all selected by default); Set = user customized
  const [customSelected, setCustomSelected] = useState<Set<string> | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const candidates = session?.status === 'completed' ? (session.candidates ?? []) : []
  // Default: all selected. Custom selection overrides.
  const selected = customSelected ?? new Set(candidates.map((c) => c.url))

  function toggleCandidate(url: string) {
    const next = new Set(selected)
    if (next.has(url)) {
      next.delete(url)
    } else {
      next.add(url)
    }
    setCustomSelected(next)
  }

  async function handleComplete(toRegister: RecipeCandidate[]) {
    if (!user) return
    setSubmitting(true)
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId: user.lineUserId, selectedCandidates: toRegister }),
    })
    router.replace('/')
  }

  if (session === undefined) return <LoadingView message="確認中..." />

  if (session === null) {
    return (
      <CenterView>
        <p className="text-muted-foreground">期限切れです。もう一度お試しください。</p>
        <Button variant="outline" onClick={() => router.replace('/onboarding')}>もう一度試す</Button>
      </CenterView>
    )
  }

  if (session.status === 'pending') return <LoadingView message="バックグラウンドで探しています..." />

  if (session.status === 'failed' || candidates.length === 0) {
    return (
      <CenterView>
        <p className="text-muted-foreground">レシピが見つかりませんでした。</p>
        <Button variant="outline" onClick={() => handleComplete([])} disabled={submitting}>スキップして始める</Button>
      </CenterView>
    )
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      <div className="mb-4 space-y-1">
        <h1 className="text-lg font-bold">レシピ候補</h1>
        <p className="text-sm text-muted-foreground">登録するレシピを選んでください</p>
      </div>
      <div className="flex-1 space-y-3">
        {candidates.map((c) => (
          <CandidateCard key={c.url} candidate={c} checked={selected.has(c.url)} onToggle={() => toggleCandidate(c.url)} />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        <Button
          className="w-full"
          onClick={() => handleComplete(candidates.filter((c) => selected.has(c.url)))}
          disabled={submitting || selected.size === 0}
        >
          {submitting ? '登録中…' : `まとめて登録する（${selected.size}件）`}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => handleComplete([])} disabled={submitting}>
          スキップして始める
        </Button>
      </div>
    </div>
  )
}

function CandidateCard({ candidate, checked, onToggle }: { candidate: RecipeCandidate; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox id={candidate.url} checked={checked} onCheckedChange={onToggle} className="mt-1" />
      {candidate.imageUrl && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded">
          <Image src={candidate.imageUrl} alt={candidate.title} fill className="object-cover" unoptimized />
        </div>
      )}
      <label htmlFor={candidate.url} className="flex-1 cursor-pointer space-y-0.5">
        <p className="text-sm font-medium leading-tight">{candidate.title}</p>
        {candidate.cookingTimeMinutes && (
          <p className="text-xs text-muted-foreground">⏱ {candidate.cookingTimeMinutes}分</p>
        )}
      </label>
    </div>
  )
}

function LoadingView({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

function CenterView({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {children}
    </div>
  )
}
