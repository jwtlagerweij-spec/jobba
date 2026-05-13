'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  question: string
  context_type: string | null
  context_ref: string | null
  created_at: string
}

interface AnsweredQuestion {
  id: string
  question: string
  answer: string
  context_type: string | null
  created_at: string
}

function QuestionCard({ q, onAnswer, onDismiss }: {
  q: Question
  onAnswer: (id: string, answer: string) => void
  onDismiss: (id: string) => void
}) {
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!answer.trim()) return
    setSaving(true)
    await onAnswer(q.id, answer.trim())
    setSaving(false)
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <p className="text-sm font-medium leading-snug">{q.question}</p>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Your answer…"
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving || !answer.trim()} size="sm">
          {saving ? 'Saving…' : 'Submit'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(q.id)}
          className="text-muted-foreground"
        >
          Skip
        </Button>
      </div>
    </div>
  )
}

export default function CoachPage() {
  const [pending, setPending] = useState<Question[]>([])
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/coach/questions')
      .then(r => r.json())
      .then(d => {
        setPending(d.pending ?? [])
        setAnswered(d.answered ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleAnswer(id: string, answer: string) {
    const res = await fetch('/api/coach/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clarification_id: id, answer }),
    })
    if (res.ok) {
      const q = pending.find(p => p.id === id)
      if (q) {
        setPending(prev => prev.filter(p => p.id !== id))
        setAnswered(prev => [{ ...q, answer }, ...prev])
        toast.success('Answer saved — your matches will improve over time.')
      }
    } else {
      toast.error('Failed to save answer.')
    }
  }

  async function handleDismiss(id: string) {
    await fetch('/api/coach/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clarification_id: id }),
    })
    setPending(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <span className="font-bold">Jobba</span>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">AI Coach</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Answer these questions to sharpen your job matches over time. All optional.
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="rounded-xl border p-5 h-32 animate-pulse bg-muted" />)}
          </div>
        )}

        {!loading && pending.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center mb-8">
            <p className="text-2xl mb-2">✓</p>
            <p className="font-semibold mb-1">All caught up</p>
            <p className="text-sm text-muted-foreground">
              New questions appear after your daily job scan when the AI spots gaps in your profile.
            </p>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <div className="space-y-4 mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {pending.length} question{pending.length !== 1 ? 's' : ''} waiting
            </p>
            {pending.map(q => (
              <QuestionCard key={q.id} q={q} onAnswer={handleAnswer} onDismiss={handleDismiss} />
            ))}
          </div>
        )}

        {answered.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answered</p>
            {answered.map(q => (
              <div key={q.id} className="rounded-xl border p-4 opacity-60">
                <p className="text-sm font-medium mb-1">{q.question}</p>
                <p className="text-sm text-muted-foreground">{q.answer}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
