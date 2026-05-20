'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadAsPDF, downloadAsWord } from '@/lib/download'
import { AppNav } from '@/components/ui/app-nav'

const TONES = [
  { value: 'warm',         label: 'Warm',         description: 'Friendly and personal, still professional' },
  { value: 'formal',       label: 'Formal',        description: 'Classic and structured' },
  { value: 'enthusiastic', label: 'Enthusiastic',  description: 'High energy, shows genuine excitement' },
  { value: 'confident',    label: 'Confident',     description: 'Direct and assertive, no filler words' },
  { value: 'concise',      label: 'Concise',       description: 'Short and to the point, max 200 words' },
]

const SUGGESTIONS = [
  'Make it more concise',
  'Make it more enthusiastic',
  'Strengthen the opening line',
  'Add more specific examples from my resume',
  'Make the closing stronger',
]

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

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

  const [mode, setMode] = useState<'generate' | 'tailor'>('generate')
  const [existingLetter, setExistingLetter] = useState('')

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isRefining])

  async function handleGenerate() {
    if (credits <= 0) { toast.error('No credits remaining.'); return }
    if (mode === 'tailor' && !existingLetter.trim()) {
      toast.error('Paste your existing cover letter first.')
      return
    }
    setIsGenerating(true)
    setContent('')
    setChatHistory([])

    const endpoint = mode === 'tailor'
      ? '/api/generate/cover-letter/tailor'
      : '/api/generate/cover-letter'

    const body = mode === 'tailor'
      ? { job_id: jobId, existing_letter: existingLetter }
      : { job_id: jobId, tone }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      const chunk = decoder.decode(value, { stream: true })
      full += chunk
      setContent(full)
    }

    setCredits(c => Math.max(0, c - 1))
    setIsGenerating(false)
  }

  async function handleRefine(instruction: string) {
    if (!instruction.trim() || !content) return
    setIsRefining(true)
    setChatInput('')
    setChatHistory(prev => [...prev, { role: 'user', text: instruction }])

    const res = await fetch('/api/generate/cover-letter/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, current_content: content, instruction }),
    })

    if (!res.ok) {
      toast.error('Refinement failed. Try again.')
      setIsRefining(false)
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let refined = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      refined += decoder.decode(value, { stream: true })
      setContent(refined)
    }

    setChatHistory(prev => [...prev, { role: 'assistant', text: "Done! I've updated the letter above." }])
    setIsRefining(false)
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
      <AppNav backHref={`/jobs/${jobId}`} backLabel={`← ${jobTitle || 'Job'}`} />

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Cover letter</h1>
          <span className="text-xs text-muted-foreground">{credits} credit{credits !== 1 ? 's' : ''} remaining</span>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border p-1 mb-6 gap-1">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'generate' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Generate new
          </button>
          <button
            onClick={() => setMode('tailor')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'tailor' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tailor existing
          </button>
        </div>

        {/* Existing letter input */}
        {mode === 'tailor' && (
          <div className="mb-5">
            <label className="text-sm font-medium block mb-1">Paste your existing cover letter</label>
            <textarea
              value={existingLetter}
              onChange={e => setExistingLetter(e.target.value)}
              rows={8}
              placeholder="Paste a cover letter you've written before that you felt was strong…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Claude will adapt your letter to this specific job while keeping your original voice.
            </p>
          </div>
        )}

        {/* Tone selector */}
        {mode === 'generate' && <div className="mb-5">
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
        </div>}

        <Button onClick={handleGenerate} disabled={isGenerating || credits <= 0} className="w-full mb-6">
          {isGenerating
            ? (mode === 'tailor' ? 'Tailoring your letter…' : 'Writing your cover letter…')
            : content ? 'Regenerate' : (mode === 'tailor' ? 'Tailor to this job' : 'Generate cover letter')
          }
        </Button>

        {content ? (
          <div className="space-y-4">
            {/* Letter */}
            <div className="rounded-xl border bg-card p-6 relative">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {content}
                {(isGenerating || isRefining) && <span className="animate-pulse">▍</span>}
              </p>
              {!isGenerating && !isRefining && (
                <button onClick={handleCopy} className="absolute top-3 right-3 text-xs text-muted-foreground hover:text-foreground underline">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            {/* Download buttons */}
            {!isGenerating && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading || isRefining}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  ↓ Download PDF
                </button>
                <button
                  onClick={() => handleDownload('word')}
                  disabled={downloading || isRefining}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  ↓ Download Word
                </button>
              </div>
            )}

            {/* Refine chat */}
            {!isGenerating && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold">Refine with AI</p>

                {/* Quick suggestions */}
                {chatHistory.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleRefine(s)}
                        disabled={isRefining}
                        className="text-xs border rounded-full px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat history */}
                {chatHistory.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                          msg.role === 'user'
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-foreground'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isRefining && (
                      <div className="flex justify-start">
                        <div className="rounded-xl px-3 py-2 text-sm bg-muted text-muted-foreground animate-pulse">
                          Rewriting…
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine(chatInput) } }}
                    placeholder="e.g. Make the opening stronger"
                    disabled={isRefining}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleRefine(chatInput)}
                    disabled={isRefining || !chatInput.trim()}
                  >
                    {isRefining ? '…' : 'Send'}
                  </Button>
                </div>
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
