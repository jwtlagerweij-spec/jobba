'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type State = 'scanning' | 'done' | 'error'

const STEPS = [
  'Reading your profile…',
  'Pulling recent vacancies…',
  'Scoring jobs against your CV…',
  'Almost there…',
]

export default function OnboardingDonePage() {
  const router = useRouter()
  const [state, setState] = useState<State>('scanning')
  const [matchCount, setMatchCount] = useState(0)
  const [errorDetail, setErrorDetail] = useState('')
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
    }, 6000)

    fetch('/api/scan/now', { method: 'POST' })
      .then(async res => {
        clearInterval(interval)
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
          setErrorDetail(`Unexpected response: ${text.slice(0, 120)}`)
          setState('error')
        }
      })
      .catch(err => {
        clearInterval(interval)
        setErrorDetail(err?.message ?? 'Network error')
        setState('error')
      })

    return () => clearInterval(interval)
  }, [])

  if (state === 'scanning') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center max-w-sm">
          <div className="relative mx-auto h-14 w-14 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          <h1 className="text-xl font-bold mb-3">Finding your first matches</h1>
          <p className="text-sm text-muted-foreground h-5 transition-all duration-500">
            {STEPS[stepIndex]}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-6">Takes about 20–30 seconds</p>
        </div>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl mx-auto mb-4">
            ⚠
          </div>
          <h1 className="text-xl font-bold mb-2">Scan timed out</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The first scan took too long. Your profile is saved — matches will appear after the
            daily run at 9am, or you can try again from your dashboard.
          </p>
          {errorDetail && (
            <p className="text-xs text-muted-foreground/50 mb-6 font-mono break-all bg-muted rounded-lg p-3">
              {errorDetail}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={() => setState('scanning')} variant="outline" className="w-full">
              Try again
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to dashboard
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">
          🎉
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {matchCount > 0
            ? `${matchCount} match${matchCount === 1 ? '' : 'es'} found`
            : "You're all set!"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {matchCount > 0
            ? 'Ranked by how well they match your profile. New matches arrive every morning at 9am.'
            : 'New matches will arrive tomorrow morning at 9am. We\'ll email you when they\'re ready.'}
        </p>
        <Button onClick={() => router.push('/dashboard')} className="w-full">
          {matchCount > 0 ? 'See my matches →' : 'Go to dashboard'}
        </Button>
      </div>
    </main>
  )
}
