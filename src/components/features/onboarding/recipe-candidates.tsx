'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
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
type SubmitMode = 'idle' | 'registering' | 'skipping'

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
  const [submitMode, setSubmitMode] = useState<SubmitMode>('idle')

  const candidates = session?.status === 'completed' ? (session.candidates ?? []) : []

  async function handleComplete(toRegister: RecipeCandidate[], mode: Exclude<SubmitMode, 'idle'>) {
    if (!user) return
    setSubmitMode(mode)
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
    return <NoResultView onSkip={() => handleComplete([], 'skipping')} submitMode={submitMode} />
  }

  return (
    <CandidatesView
      candidates={candidates}
      submitMode={submitMode}
      onRegister={(s) => handleComplete(s, 'registering')}
      onSkip={() => handleComplete([], 'skipping')}
    />
  )
}

interface CandidatesViewProps {
  candidates: RecipeCandidate[]
  submitMode: SubmitMode
  onRegister: (selected: RecipeCandidate[]) => void
  onSkip: () => void
}

function CandidatesView({ candidates, submitMode, onRegister, onSkip }: CandidatesViewProps) {
  const [customSelected, setCustomSelected] = useState<Set<string> | null>(null)
  const selected = customSelected ?? new Set(candidates.map((c) => c.url))
  const submitting = submitMode !== 'idle'

  function toggleCandidate(url: string) {
    const next = new Set(selected)
    if (next.has(url)) { next.delete(url) } else { next.add(url) }
    setCustomSelected(next)
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
        <Button className="w-full" onClick={() => onRegister(candidates.filter((c) => selected.has(c.url)))} disabled={submitting || selected.size === 0}>
          {submitMode === 'registering' ? '登録中…' : `まとめて登録する（${selected.size}件）`}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSkip} disabled={submitting}>
          {submitMode === 'skipping' ? 'スキップ中…' : 'スキップして始める'}
        </Button>
      </div>
    </div>
  )
}

function getSiteName(url: string): string {
  if (url.includes('delishkitchen.tv')) return 'DELISH KITCHEN'
  if (url.includes('oceans-nadia.com')) return 'Nadia'
  if (url.includes('kurashiru.com')) return 'クラシル'
  if (url.includes('cookpad.com')) return 'クックパッド'
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

function CandidateCard({ candidate, checked, onToggle }: { candidate: RecipeCandidate; checked: boolean; onToggle: () => void }) {
  const siteName = getSiteName(candidate.url)
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox id={candidate.url} checked={checked} onCheckedChange={onToggle} className="mt-1" />
      {candidate.imageUrl && (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={candidate.imageUrl} alt={candidate.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex-1 space-y-0.5">
        <label htmlFor={candidate.url} className="block cursor-pointer text-sm font-medium leading-tight">
          {candidate.title}
        </label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {siteName && <span>{siteName}</span>}
          {candidate.cookingTimeMinutes && <span>⏱ {candidate.cookingTimeMinutes}分</span>}
        </div>
        <a
          href={candidate.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-xs text-primary underline"
        >
          元のページを見る <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

function NoResultView({ onSkip, submitMode }: { onSkip: () => void; submitMode: SubmitMode }) {
  return (
    <CenterView>
      <p className="text-muted-foreground">レシピが見つかりませんでした。</p>
      <Button variant="outline" onClick={onSkip} disabled={submitMode !== 'idle'}>
        {submitMode === 'skipping' ? 'スキップ中…' : 'スキップして始める'}
      </Button>
    </CenterView>
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
