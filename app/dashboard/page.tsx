'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { CompanyLogo } from '@/components/ui/company-logo'
import { Button } from '@/components/ui/button'

interface Job {
  id: string
  title: string
  company: string | null
  location: string | null
  url: string
  salary_min: number | null
  salary_max: number | null
  source: string
  is_remote: boolean
  posted_at: string | null
}

interface Match {
  id: string
  fit_score: number
  fit_explanation: string | null
  user_viewed: boolean
  batch_date: string
  jobs: Job | null
  application_status: string | null
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? 'bg-green-100 text-green-800 border-green-200' :
    score >= 6 ? 'bg-amber-100 text-amber-800 border-amber-200' :
                 'bg-red-100 text-red-800 border-red-200'
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-bold shrink-0 ${color}`}>
      {score}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = { adzuna: 'Adzuna', nvb: 'NVB', intermediair: 'Intermediair' }
  return (
    <span className="text-xs border rounded px-1.5 py-0.5 text-muted-foreground">
      {labels[source] ?? source}
    </span>
  )
}

function StatusChip({ status, jobId, onUpdate }: { status: string | null; jobId: string; onUpdate: (jobId: string, status: string) => void }) {
  const options = ['saved', 'applied', 'interviewing', 'offered', 'rejected']
  const colors: Record<string, string> = {
    saved: 'bg-muted text-muted-foreground',
    applied: 'bg-blue-100 text-blue-800',
    interviewing: 'bg-purple-100 text-purple-800',
    offered: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value
    onUpdate(jobId, newStatus)
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, status: newStatus }),
    })
  }

  const current = status ?? 'save'
  return (
    <select
      value={status ?? ''}
      onChange={handleChange}
      onClick={e => e.stopPropagation()}
      className={`text-xs rounded-full px-2 py-1 border-0 cursor-pointer font-medium ${colors[current] ?? 'bg-muted text-muted-foreground'}`}
    >
      <option value="">Track status</option>
      {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
    </select>
  )
}

function AddJobForm({ onAdded }: { onAdded: (match: Match) => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [manualText, setManualText] = useState('')
  const [needsManual, setNeedsManual] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    if (!url.trim() && !manualText.trim()) return
    setImporting(true)
    setNeedsManual(false)

    const res = await fetch('/api/jobs/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() || undefined, manual_text: manualText.trim() || undefined }),
    })

    const data = await res.json()

    if (res.status === 422 && data.needs_manual) {
      setNeedsManual(true)
      setImporting(false)
      toast.info("Couldn't fetch the page automatically — paste the job description below.")
      return
    }

    if (!res.ok) {
      toast.error(data.error ?? 'Import failed.')
      setImporting(false)
      return
    }

    toast.success(`Added: ${data.title}`)
    setOpen(false)
    setUrl('')
    setManualText('')
    // Refresh matches
    fetch('/api/matches')
      .then(r => r.json())
      .then(d => { if (d.matches?.length) onAdded(d.matches[0]) })
    setImporting(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 py-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        + Add a job you found yourself
      </button>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Add a job from LinkedIn, Indeed, or anywhere</p>
        <button onClick={() => { setOpen(false); setNeedsManual(false) }} className="text-muted-foreground hover:text-foreground text-lg">×</button>
      </div>

      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://www.linkedin.com/jobs/view/..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {needsManual && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            The page couldn&apos;t be fetched automatically (LinkedIn requires login). Paste the job description here:
          </p>
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            rows={6}
            placeholder="Paste the full job description here…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleImport} disabled={importing || (!url.trim() && !manualText.trim())} size="sm" className="flex-1">
          {importing ? 'Analysing job…' : 'Import and score'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setNeedsManual(false) }}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('full_name').single().then(({ data }) => {
      if (data?.full_name) setUserName(data.full_name.split(' ')[0])
    })

    fetch('/api/matches')
      .then(r => r.json())
      .then(data => setMatches(data.matches ?? []))
      .finally(() => setLoading(false))
  }, [])

  function markViewed(matchId: string, jobId: string) {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, user_viewed: true } : m))
    fetch(`/api/matches/${matchId}/viewed`, { method: 'PATCH' }).catch(() => {})
    router.push(`/jobs/${jobId}`)
  }

  function updateStatus(jobId: string, status: string) {
    setMatches(prev => prev.map(m => m.jobs?.id === jobId ? { ...m, application_status: status } : m))
  }

  const greeting = userName ? `Good morning, ${userName}` : 'Good morning'
  const today = new Date().toLocaleDateString('en-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">Jobba</span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/coach" className="text-muted-foreground hover:text-foreground">Coach</Link>
          <Link href="/applications" className="text-muted-foreground hover:text-foreground">Applications</Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground">Profile</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-1">{today} · {matches.length} match{matches.length !== 1 ? 'es' : ''} today</p>
        </div>

        <div className="mb-6">
          <AddJobForm onAdded={m => setMatches(prev => [m, ...prev.filter(x => x.jobs?.id !== m.jobs?.id)])} />
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-2xl mb-3">🔍</p>
            <h2 className="font-semibold mb-1">No matches yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your first job matches will appear here. The daily scan runs every morning at 9am — check back tomorrow.
            </p>
          </div>
        )}

        {!loading && matches.length > 0 && (
          <div className="space-y-4">
            {matches.map(match => {
              const job = match.jobs
              if (!job) return null
              return (
                <div
                  key={match.id}
                  className="rounded-xl border bg-card p-5 hover:border-foreground/30 transition-colors cursor-pointer relative"
                  onClick={() => markViewed(match.id, job.id)}
                >
                  {!match.user_viewed && (
                    <span className="absolute top-4 right-4 text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 font-medium">
                      New
                    </span>
                  )}
                  {/* Header: logo + title + score */}
                  <div className="flex items-start gap-3">
                    <CompanyLogo company={job.company ?? 'Company'} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm leading-snug">{job.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {job.company ?? 'Unknown company'} · {job.location ?? 'Location unknown'}
                            {job.is_remote && ' · Remote'}
                          </p>
                        </div>
                        <ScoreBadge score={match.fit_score} />
                      </div>
                    </div>
                  </div>

                  {/* Salary */}
                  {(job.salary_min || job.salary_max) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      €{job.salary_min?.toLocaleString()} – €{job.salary_max?.toLocaleString()}
                    </p>
                  )}

                  {/* Fit explanation */}
                  {match.fit_explanation && (
                    <p className="text-sm mt-3 leading-relaxed text-foreground/80 border-t pt-3">
                      {match.fit_explanation}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <SourceBadge source={job.source} />
                    <StatusChip status={match.application_status} jobId={job.id} onUpdate={updateStatus} />
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs underline text-muted-foreground hover:text-foreground ml-auto"
                    >
                      View job →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
