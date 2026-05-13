'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { CompanyLogo } from '@/components/ui/company-logo'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface JobData {
  job: {
    id: string; title: string; company: string | null; location: string | null
    description: string | null; url: string; salary_min: number | null
    salary_max: number | null; source: string; is_remote: boolean; posted_at: string | null
  }
  match: { fit_score: number; fit_explanation: string | null } | null
  application: { status: string | null; notes: string | null } | null
  cover_letter: { version: number } | null
  tailored_resume: { version: number } | null
  credits: number
}

const STATUS_OPTIONS = ['saved', 'applied', 'interviewing', 'offered', 'rejected']

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string

  const [data, setData] = useState<JobData | null>(null)
  const [status, setStatus] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setStatus(d.application?.status ?? '')
      })
  }, [jobId])

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    setSaving(true)
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, status: newStatus }),
      })
    } catch {
      toast.error('Failed to save status.')
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  const { job, match, cover_letter, tailored_resume, credits } = data

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <span className="font-bold ml-auto">Jobba</span>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start gap-4">
          <CompanyLogo company={job.company ?? 'Company'} size={52} />
          <div className="flex-1">
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
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 ${
              match.fit_score >= 8 ? 'bg-green-100 text-green-800 border-green-200' :
              match.fit_score >= 6 ? 'bg-amber-100 text-amber-800 border-amber-200' :
              'bg-red-100 text-red-800 border-red-200'
            }`}>
              {match.fit_score}
            </div>
          )}
        </div>

        {/* Fit explanation */}
        {match?.fit_explanation && (
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Why this matches you</p>
            <p className="text-sm leading-relaxed">{match.fit_explanation}</p>
          </div>
        )}

        {/* Status tracker */}
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
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground hover:border-foreground/40'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* AI Actions */}
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">AI tools</p>
            <span className="text-xs text-muted-foreground">{credits} credit{credits !== 1 ? 's' : ''} remaining</span>
          </div>

          {credits === 0 && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
              You&apos;ve used all your welcome credits. More credits coming soon — you&apos;ll be notified when Pro launches.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href={`/jobs/${jobId}/cover-letter`}
              className={cn(buttonVariants({ variant: 'default' }), 'flex-1 text-center')}
            >
              {cover_letter ? `Cover letter (v${cover_letter.version})` : '✦ Generate cover letter'}
            </Link>
            <Link
              href={`/jobs/${jobId}/resume`}
              className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 text-center')}
            >
              {tailored_resume ? `Tailored resume (v${tailored_resume.version})` : 'Tailor my resume'}
            </Link>
          </div>
        </div>

        {/* Job description */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Job description</h2>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              View original →
            </a>
          </div>
          <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line border rounded-xl p-4 max-h-96 overflow-y-auto">
            {job.description ?? 'No description available.'}
          </div>
        </div>

      </main>
    </div>
  )
}
