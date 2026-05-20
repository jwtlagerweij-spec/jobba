'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type State = 'scanning' | 'done' | 'error'

export default function OnboardingDonePage() {
  const router = useRouter()
  const [state, setState] = useState<State>('scanning')
  const [matchCount, setMatchCount] = useState(0)
  const [errorDetail, setErrorDetail] = useState('')

  useEffect(() => {
    fetch('/api/scan/now', { method: 'POST' })
      .then(async res => {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          if (!res.ok) {
            setErrorDetail(data.error ?? `HTTP ${res.status}`)
            setState('error')
            return
          }
          setMatchCount(data.matches_found ?? 0)
          setState('done')
        } catch {
          setErrorDetail(`Parse error: ${text.slice(0, 100)}`)
          setState('error')
        }
      })
      .catch(err => {
        setErrorDetail(err?.message ?? 'Network error')
        setState('error')
      })
  }, [])

  if (state === 'scanning') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center max-w-sm">
          <div className="mb-6">
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-foreground/20 border-t-foreground animate-spin" />
          </div>
          <h1 className="text-xl font-bold mb-2">Finding your first matches…</h1>
          <p className="text-sm text-muted-foreground animate-pulse">
            Searching job boards and scoring vacancies for your profile. This takes about a minute.
          </p>
        </div>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-4">⚠️</p>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-2">
            We couldn&apos;t complete your first scan. You can still access your dashboard — matches will appear after the next daily run.
          </p>
          {errorDetail && (
            <p className="text-xs text-muted-foreground/60 mb-6 font-mono break-all">{errorDetail}</p>
          )}
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Go to dashboard
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">
          {matchCount > 0
            ? `Found ${matchCount} job${matchCount === 1 ? '' : 's'} for you`
            : 'You\'re all set!'}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {matchCount > 0
            ? 'Ranked by how well they match your profile. New matches arrive every morning at 9am.'
            : 'New matches will arrive tomorrow morning. We\'ll email you when they\'re ready.'}
        </p>
        <Button onClick={() => router.push('/dashboard')} className="w-full">
          {matchCount > 0 ? 'See my matches →' : 'Go to dashboard'}
        </Button>
      </div>
    </main>
  )
}
