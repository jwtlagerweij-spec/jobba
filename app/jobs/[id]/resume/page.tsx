'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadAsPDF, downloadAsWord } from '@/lib/download'

export default function ResumePage() {
  const params = useParams()
  const jobId = params.id as string

  const [originalText, setOriginalText] = useState('')
  const [tailoredContent, setTailoredContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [credits, setCredits] = useState(0)
  const [jobTitle, setJobTitle] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then(d => {
        setJobTitle(d.job?.title ?? '')
        setCredits(d.credits ?? 0)
        if (d.tailored_resume) {
          setTailoredContent(d.tailored_resume.tailored_text ?? '')
          setOriginalText(d.tailored_resume.original_text ?? '')
        }
      })

    fetch('/api/resume/text')
      .then(r => r.json())
      .then(d => { if (d.resume_text && !originalText) setOriginalText(d.resume_text) })
  }, [jobId])

  async function handleGenerate() {
    if (credits <= 0) { toast.error('No credits remaining.'); return }
    setIsGenerating(true)
    setTailoredContent('')

    const res = await fetch('/api/generate/resume', {
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
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      setTailoredContent(prev => prev + decoder.decode(value, { stream: true }))
    }

    setCredits(c => Math.max(0, c - 1))
    setIsGenerating(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(tailoredContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownload(format: 'pdf' | 'word') {
    setDownloading(true)
    const filename = `Resume — ${jobTitle}`.replace(/[/\\?%*:|"<>]/g, '-')
    try {
      if (format === 'pdf') await downloadAsPDF(tailoredContent, filename)
      else await downloadAsWord(tailoredContent, filename)
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

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Tailored resume</h1>
          <span className="text-xs text-muted-foreground">{credits} credit{credits !== 1 ? 's' : ''} remaining</span>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating || credits <= 0} className="mb-8">
          {isGenerating ? 'Tailoring your resume…' : tailoredContent ? 'Regenerate' : 'Tailor my resume'}
        </Button>

        {tailoredContent && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Original</p>
              <div className="rounded-xl border p-5 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground max-h-[70vh] overflow-y-auto">
                {originalText || 'Loading…'}
              </div>
            </div>
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">Tailored for this job</p>
              <div className="rounded-xl border border-foreground/20 bg-card p-5 text-sm leading-relaxed whitespace-pre-wrap max-h-[70vh] overflow-y-auto">
                {tailoredContent}
                {isGenerating && <span className="animate-pulse">▍</span>}
              </div>
              {!isGenerating && (
                <button onClick={handleCopy} className="absolute top-0 right-3 text-xs text-muted-foreground hover:text-foreground underline">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        )}

        {tailoredContent && !isGenerating && (
          <div className="flex gap-2 mt-4">
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

        {!tailoredContent && !isGenerating && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-2xl mb-2">📄</p>
            <p className="text-sm text-muted-foreground">
              Click the button above to generate a version of your resume tailored to this specific job.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
