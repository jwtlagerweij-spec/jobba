'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ExtractedProfile {
  profile_summary: string
  job_titles: string[]
  keywords: string
}

function UploadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromProfile = searchParams.get('from') === 'profile'
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<ExtractedProfile | null>(null)
  const [editingTitles, setEditingTitles] = useState(false)
  const [titles, setTitles] = useState<string[]>([])

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(picked.type)) { toast.error('Please select a PDF or Word (.docx) file.'); return }
    if (picked.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB.'); return }
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
      if (!res.ok) { toast.error(data.error ?? 'Upload failed.'); return }
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
    router.push(fromProfile ? '/profile' : '/onboarding/preferences')
  }

  if (profile) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-lg">
          {fromProfile && (
            <Link href="/profile" className="inline-block text-sm text-muted-foreground hover:text-foreground mb-6">
              ← Back to profile
            </Link>
          )}
          <div className="mb-3 text-center"><span className="text-3xl">✓</span></div>
          <h1 className="text-2xl font-bold text-center mb-1">Here&apos;s what I see in you</h1>
          <p className="text-sm text-center text-muted-foreground mb-8">
            Based on your resume — review and confirm before we find your matches
          </p>
          <div className="rounded-xl border bg-card p-6 space-y-6">
            <p className="text-sm leading-relaxed">{profile.profile_summary}</p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search terms we&apos;ll use</span>
                <button onClick={() => setEditingTitles(v => !v)} className="text-xs underline text-muted-foreground">
                  {editingTitles ? 'Done' : 'Edit'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {titles.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium">
                    {t}
                    {editingTitles && (
                      <button onClick={() => removeTitle(i)} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
                    )}
                  </span>
                ))}
                {editingTitles && (
                  <input type="text" placeholder="Add title + Enter" onKeyDown={addTitle}
                    className="rounded-full border px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
                )}
              </div>
            </div>
          </div>
          <Button onClick={handleContinue} className="w-full mt-6">Looks good — continue</Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            {fromProfile ? 'Your profile has been updated.' : 'Next: a few optional questions to sharpen your results'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm text-center">
        {fromProfile ? (
          <div className="mb-6 text-left">
            <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">← Back to profile</Link>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { n: '1', label: 'Account', done: true },
              { n: '2', label: 'Resume', active: true },
              { n: '3', label: 'Preferences' },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 ${i > 0 ? 'ml-2' : ''}`}>
                  {i > 0 && <div className="w-6 h-px bg-border" />}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.done ? 'bg-primary text-primary-foreground' :
                    step.active ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <span className={`text-xs font-medium ${step.active ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {fromProfile ? 'Upload a new resume' : 'Upload your resume'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {fromProfile
              ? 'We\'ll re-read it and update your profile and search terms.'
              : 'Jobba reads your CV with AI to understand your background and score jobs for fit.'
            }
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/40 transition-colors p-10 mb-4"
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFilePick} />
          <div className="text-4xl mb-3">📄</div>
          {file ? (
            <p className="text-sm font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Click to select your resume</p>
              <p className="text-xs text-muted-foreground mt-1">PDF or Word (.docx) · Max 5 MB</p>
            </>
          )}
        </div>
        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full text-base py-5">
          {uploading ? 'Analysing your resume…' : 'Upload and analyse →'}
        </Button>
        {uploading && (
          <p className="text-xs text-muted-foreground mt-4 animate-pulse">
            AI is reading your resume — this takes about 15 seconds…
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-6">
          Stored securely in the EU · Never used to train AI models.{' '}
          <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>
        </p>
      </div>
    </main>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  )
}
