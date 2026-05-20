'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AppNav } from '@/components/ui/app-nav'

export default function InterviewPrepPage() {
  const params = useParams()
  const jobId = params.id as string

  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [credits, setCredits] = useState(0)
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then(d => {
        setJobTitle(d.job?.title ?? '')
        setCompany(d.job?.company ?? '')
        setCredits(d.credits ?? 0)
      })
  }, [jobId])

  async function handleGenerate() {
    if (credits <= 0) { toast.error('No credits remaining.'); return }
    setIsGenerating(true)
    setContent('')

    const res = await fetch('/api/generate/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Generation failed.' }))
      toast.error(err.error ?? 'Generation failed.')
      setIsGenerating(false)
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      full += decoder.decode(value, { stream: true })
      setContent(full)
    }

    setCredits(c => Math.max(0, c - 1))
    setIsGenerating(false)
  }

  // Parse content into individual Q&A blocks
  const blocks = content.split('\n---\n').map(b => b.trim()).filter(Boolean)

  return (
    <div className="min-h-screen bg-background">
      <AppNav backHref={`/jobs/${jobId}`} backLabel={`← ${jobTitle || 'Job'}`} />

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Interview prep</h1>
          <span className="text-xs text-muted-foreground">{credits} credit{credits !== 1 ? 's' : ''} remaining</span>
        </div>
        {company && (
          <p className="text-sm text-muted-foreground mb-6">
            Tailored questions for {jobTitle} at {company}
          </p>
        )}

        <Button onClick={handleGenerate} disabled={isGenerating || credits <= 0} className="w-full mb-8">
          {isGenerating ? 'Preparing your questions…' : content ? 'Regenerate' : 'Prepare me for this interview'}
        </Button>

        {isGenerating && !content && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            ))}
          </div>
        )}

        {blocks.length > 0 && (
          <div className="space-y-4">
            {blocks.map((block, i) => {
              const lines = block.split('\n').filter(Boolean)
              const questionLine = lines.find(l => l.startsWith('**Question'))
              const whyLine = lines.find(l => l.startsWith('*Why'))
              const answerLine = lines.find(l => l.startsWith('*Your answer'))

              const question = questionLine?.replace(/\*\*/g, '').replace(/^Question \d+: /, '') ?? block
              const why = whyLine?.replace(/\*Why they ask this:\* /, '') ?? ''
              const answer = answerLine?.replace(/\*Your answer:\* /, '') ?? ''

              return (
                <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <h3 className="font-semibold text-sm leading-snug">{question}</h3>
                  </div>

                  {why && (
                    <div className="ml-10">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Why they ask this</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{why}</p>
                    </div>
                  )}

                  {answer && (
                    <div className="ml-10">
                      <p className="text-xs font-medium uppercase tracking-wide mb-1">Your answer</p>
                      <p className="text-sm leading-relaxed text-foreground/85">{answer}</p>
                    </div>
                  )}

                  {!why && !answer && (
                    <p className="ml-10 text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                      {lines.slice(1).join('\n')}
                      {isGenerating && i === blocks.length - 1 && <span className="animate-pulse">▍</span>}
                    </p>
                  )}
                </div>
              )
            })}
            {isGenerating && (
              <div className="rounded-xl border bg-card p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            )}
          </div>
        )}

        {!content && !isGenerating && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm text-muted-foreground">
              Get 6 likely interview questions with personalised answers based on your resume and this specific job.
            </p>
          </div>
        )}

        {credits === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            You&apos;ve used all your welcome credits. Pro plan coming soon.
          </p>
        )}
      </main>
    </div>
  )
}
