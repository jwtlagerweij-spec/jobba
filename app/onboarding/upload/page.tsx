'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ExtractedProfile {
  profile_summary: string
  job_titles: string[]
  keywords: string
}

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<ExtractedProfile | null>(null)
  const [editingTitles, setEditingTitles] = useState(false)
  const [titles, setTitles] = useState<string[]>([])

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    if (picked.type !== 'application/pdf') {
      toast.error('Please select a PDF file.')
      return
    }
    if (picked.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB.')
      return
    }
    setFile(picked)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)

    const form = new FormData()
    form.append('resume', file)

    try {
      const res = await fetch('/api/resume/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed.')
        return
      }

      setProfile(data)
      setTitles(data.job_titles ?? [])
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function removeTitle(i: number) {
    setTitles(prev => prev.filter((_, idx) => idx !== i))
  }

  function addTitle(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const val = (e.target as HTMLInputElement).value.trim()
      if (val && !titles.includes(val)) {
        setTitles(prev => [...prev, val])
        ;(e.target as HTMLInputElement).value = ''
      }
    }
  }

  function handleContinue() {
    router.push('/onboarding/preferences')
  }

  if (profile) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-lg">
          <div className="mb-3 text-center">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">Here&apos;s what I see in you</h1>
          <p className="text-sm text-center text-muted-foreground mb-8">
            Based on your resume — review and confirm before we find your matches
          </p>

          <div className="rounded-xl border bg-card p-6 space-y-6">
            <div>
              <p className="text-sm leading-relaxed">{profile.profile_summary}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Search terms we&apos;ll use
                </span>
                <button
                  onClick={() => setEditingTitles(v => !v)}
                  className="text-xs underline text-muted-foreground"
                >
                  {editingTitles ? 'Done' : 'Edit'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {titles.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
                  >
                    {t}
                    {editingTitles && (
                      <button
                        onClick={() => removeTitle(i)}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {editingTitles && (
                  <input
                    type="text"
                    placeholder="Add title + Enter"
                    onKeyDown={addTitle}
                    className="rounded-full border px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleContinue} className="w-full mt-6">
            Looks good — continue
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Next: a few optional questions to sharpen your results
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Upload your resume</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ll read it to understand your background and find matching jobs automatically.
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors p-10 mb-4"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFilePick}
          />
          <div className="text-4xl mb-3">📄</div>
          {file ? (
            <p className="text-sm font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Click to select your PDF</p>
              <p className="text-xs text-muted-foreground mt-1">Max 5 MB</p>
            </>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? 'Analysing your resume…' : 'Upload and analyse'}
        </Button>

        {uploading && (
          <p className="text-xs text-muted-foreground mt-4 animate-pulse">
            Claude is reading your resume — this takes about 15 seconds…
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Your resume is processed by Claude (Anthropic) and stored securely in the EU.
          It is never used to train AI models. See our{' '}
          <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </main>
  )
}
