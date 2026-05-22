'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'
import { CompanyLogo } from '@/components/ui/company-logo'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AppNav } from '@/components/ui/app-nav'

interface JobData {
  job: {
    id: string
    title: string
    company: string | null
    location: string | null
    description: string | null
    url: string
    salary_min: number | null
    salary_max: number | null
    source: string
    is_remote: boolean
    posted_at: string | null
  }
  match: { fit_score: number; fit_explanation: string | null } | null
  application: { status: string | null; notes: string | null } | null
  cover_letter: { version: number } | null
  tailored_resume: { version: number } | null
  credits: number
  ai_unlocked: boolean
}

const STATUS_OPTIONS = ['saved', 'applied', 'interviewing', 'offered', 'rejected']

const STATUS_BADGE: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-700 border-slate-200',
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  interviewing: 'bg-violet-100 text-violet-700 border-violet-200',
  offered: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

function JobDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-24 bg-muted rounded-xl" />
      <div className="h-40 bg-muted rounded-xl" />
    </div>
  )
}

function JobDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = params.id as string

  const backHref = searchParams.get('back') ?? '/dashboard'
  const backLabel =
    backHref.startsWith('/jobs')
      ? '← Back to jobs'
      : backHref === '/matches'
      ? '← My matches'
      : '← Dashboard'

  const [data, setData] = useState<JobData | null>(null)
  const [status, setStatus] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [skillsGap, setSkillsGap] = useState<{ matched: string[]; missing: string[] } | null>(null)
  const [loadingSkills, setLoadingSkills] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setStatus(d.application?.status ?? '')
        setNotes(d.application?.notes ?? '')
      })

    setLoadingSkills(true)
    fetch(`/api/jobs/${jobId}/skills-gap`)
      .then(r => r.json())
      .then(d => {
        if (d.matched || d.missing) setSkillsGap(d)
      })
      .finally(() => setLoadingSkills(false))
  }, [jobId])

  async function handleStatusChange(newStatus: string) {
    const next = status === newStatus ? '' : newStatus
    setStatus(next)
    setSaving(true)
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, status: next || 'saved', notes }),
      })
    } catch {
      toast.error('Failed to save status.')
    } finally {
      setSaving(false)
    }
  }

  function handleNotesChange(val: string) {
    setNotes(val)
    setNotesSaved(false)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, status: status || 'saved', notes: val }),
      })
      setNotesSaved(true)
    }, 800)
  }

  if (!data) {
    return <JobDetailSkeleton />
  }

  const { job, match, cover_letter, tailored_resume, credits, ai_unlocked } = data

  const scoreColor =
    match && match.fit_score >= 8
      ? 'bg-green-100 text-green-800 border-green-200'
      : match && match.fit_score >= 6
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-red-100 text-red-800 border-red-200'

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <CompanyLogo company={job.company ?? 'Company'} size={52} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-snug">{job.title}</h1>
          <p className="text-muted-foreground mt-0.5">
            {job.company ?? 'Unknown company'} · {job.location ?? 'Netherlands'}
            {job.is_remote && ' · Remote'}
          </p>
          {(job.salary_min || job.salary_max) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              €{job.salary_min?.toLocaleString()} – €{job.salary_max?.toLocaleString()}
            </p>
          )}
        </div>
        {match && (
          <div
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 ${scoreColor}`}
          >
            {match.fit_score}
          </div>
        )}
      </div>

      {/* Staleness warning */}
      {job.posted_at && (() => {
        const days = Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86400000)
        return days > 21 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2.5 text-sm text-amber-800">
            <span className="shrink-0">⚠</span>
            <span>
              This vacancy was posted <strong>{days} days ago</strong> and may already be filled.
              {' '}<a href={job.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-75">Check the original listing</a> before applying.
            </span>
          </div>
        ) : null
      })()}

      {/* Fit explanation */}
      {match?.fit_explanation && (
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Why this matches you
          </p>
          <p className="text-sm leading-relaxed">{match.fit_explanation}</p>
        </div>
      )}

      {/* Skills gap */}
      {(loadingSkills || skillsGap) && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Skills match
          </p>
          {loadingSkills && !skillsGap && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-3 bg-muted rounded animate-pulse w-2/3" />
              ))}
            </div>
          )}
          {skillsGap && (
            <div className="space-y-2">
              {skillsGap.matched.map(s => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500 font-bold shrink-0">✓</span>
                  <span>{s}</span>
                </div>
              ))}
              {skillsGap.missing.map(s => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className="text-red-400 font-bold shrink-0">✗</span>
                  <span className="text-muted-foreground">{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Application status */}
      <div>
        <p className="text-sm font-medium mb-2">Application status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={saving}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                status === s
                  ? STATUS_BADGE[s] ?? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="job-notes" className="text-sm font-medium">
            Notes
          </label>
          {notesSaved && <span className="text-xs text-green-600">Saved</span>}
        </div>
        <textarea
          id="job-notes"
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="Recruiter name, interview date, things to mention, salary discussed…"
          rows={3}
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* AI Actions */}
      <div className="rounded-xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">AI tools</p>
          <span className="text-xs text-muted-foreground">
            {credits} credit{credits !== 1 ? 's' : ''} remaining
          </span>
        </div>

        {ai_unlocked ? (
          <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
            ✓ This job is unlocked — all AI tools are free to use as many times as you want.
          </p>
        ) : credits === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
            You&apos;ve used all your welcome credits. More credits coming soon.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
            Using any AI tool on this job costs 1 credit. Once unlocked, all tools are free for
            this job. You have {credits} credit{credits !== 1 ? 's' : ''} remaining.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href={`/jobs/${jobId}/cover-letter`}
            className={cn(buttonVariants({ variant: 'default' }), 'flex-1 justify-center')}
          >
            {cover_letter ? `Cover letter (v${cover_letter.version})` : '✦ Cover letter'}
          </Link>
          <Link
            href={`/jobs/${jobId}/resume`}
            className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 justify-center')}
          >
            {tailored_resume ? `Resume (v${tailored_resume.version})` : 'Tailor resume'}
          </Link>
        </div>
        <Link
          href={`/jobs/${jobId}/interview`}
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}
        >
          🎯 Prepare for interview
        </Link>
      </div>

      {/* Job description */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Job description</h2>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View original <ExternalLink size={11} />
          </a>
        </div>
        <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line border rounded-xl p-4 max-h-96 overflow-y-auto">
          {job.description ?? 'No description available.'}
        </div>
      </div>
    </main>
  )
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="sticky top-0 z-20 bg-background border-b h-14" />}>
        <JobDetailNav jobId={jobId} />
      </Suspense>
      <Suspense fallback={<JobDetailSkeleton />}>
        <JobDetailInner />
      </Suspense>
    </div>
  )
}

function JobDetailNav({ jobId }: { jobId: string }) {
  const searchParams = useSearchParams()
  const backHref = searchParams.get('back') ?? '/dashboard'
  const backLabel =
    backHref.startsWith('/jobs')
      ? '← Back to jobs'
      : backHref === '/matches'
      ? '← My matches'
      : '← Dashboard'
  return <AppNav backHref={backHref} backLabel={backLabel} />
}
