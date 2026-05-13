'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadAsPDF, downloadAsWord } from '@/lib/download'

const TONES = [
  { value: 'warm',         label: 'Warm',         description: 'Friendly and personal, still professional' },
  { value: 'formal',       label: 'Formal',        description: 'Classic and structured' },
  { value: 'enthusiastic', label: 'Enthusiastic',  description: 'High energy, shows genuine excitement' },
  { value: 'confident',    label: 'Confident',     description: 'Direct and assertive, no filler words' },
  { value: 'concise',      label: 'Concise',       description: 'Short and to the point, max 200 words' },
]

export default function CoverLetterPage() {
  const params = useParams()
  const jobId = params.id as string

  const [tone, setTone] = useState('warm')
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [credits, setCredits] = useState(0)
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then(d => {
        setJobTitle(d.job?.title ?? '')
        setCompany(d.job?.company ?? '')
        setCredits(d.credits ?? 0)
        if (d.cover_letter?.content) setContent(d.cover_letter.content)
      })
  }, [jobId])

  async function handleGenerate() {
    if (credits <= 0) { toast.error('No credits remaining.'); return }
    setIsGenerating(true)
    setContent('')

    const res = await fetch('/api/generate/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, tone }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Generation failed.' }))
      toast.error(err.error ?? 'Generation failed.')
      setIsGenerating(false)
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      setContent(prev => prev + decoder.decode(value, { stream: true }))
    }

    setCredits(c => Math.max(0, c - 1))
    setIsGenerating(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownload(format: 'pdf' | 'word') {
    setDownloading(true)
    const filename = `Cover Letter — ${jobTitle} at ${company}`.replace(/[/\\?%*:|"<>]/g, '-')
    try {
      if (format === 'pdf') await downloadAsPDF(content, filename)
      else await downloadAsWord(content, filename)
    } catch {
      toast.error('Download failed. Try copying the text instead.')
    }
    setDownloading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4 flex items-center gap-4">
        <Link href={`/jobs/${jobId}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {jobTitle || 'Job'}
        </Link>
        <span className="font-bold ml-auto">Jobba</span>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Cover letter</h1>
          <span className="text-xs text-muted-foreground">{credits} credit{credits !== 1 ? 's' : ''} remaining</span>
        </div>

        {/* Tone selector */}
        <div className="mb-5">
          <p className="text-sm font-medium mb-2">Tone</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                title={t.description}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  tone === t.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground hover:border-foreground/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {TONES.find(t => t.value === tone)?.description}
          </p>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating || credits <= 0} className="w-full mb-6">
          {isGenerating ? 'Writing your cover letter…' : content ? 'Regenerate' : 'Generate cover letter'}
        </Button>

        {content ? (
          <div className="space-y-3">
            <div className="rounded-xl border bg-card p-6 relative">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {content}
                {isGenerating && <span className="animate-pulse">▍</span>}
              </p>
              {!isGenerating && (
                <button onClick={handleCopy} className="absolute top-3 right-3 text-xs text-muted-foreground hover:text-foreground underline">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            {!isGenerating && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  ↓ Download PDF
                </button>
                <button
                  onClick={() => handleDownload('word')}
                  disabled={downloading}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  ↓ Download Word
                </button>
              </div>
            )}
          </div>
        ) : !isGenerating && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-2xl mb-2">✉️</p>
            <p className="text-sm text-muted-foreground">
              Select a tone and click generate to write a personalised cover letter.
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
