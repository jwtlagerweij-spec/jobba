'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { CompanyLogo } from '@/components/ui/company-logo'
import { Button } from '@/components/ui/button'
import { AppNav } from '@/components/ui/app-nav'
import { useLanguage, t } from '@/lib/language-context'

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
  user_feedback: number | null
  jobs: Job | null
  application_status: string | null
}

function ScoreBadge({ score }: { score: number }) {
  const { bg, ring, label } =
    score >= 8 ? { bg: 'bg-green-500', ring: 'ring-green-100', label: 'Great fit' } :
    score >= 6 ? { bg: 'bg-amber-400', ring: 'ring-amber-100', label: 'Good fit' } :
                 { bg: 'bg-slate-300', ring: 'ring-slate-100', label: 'Low fit' }
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold text-white ring-4 ${bg} ${ring}`}>
        {score}
      </span>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = { adzuna: 'Adzuna', nvb: 'NVB', intermediair: 'Intermediair', jobbird: 'Jobbird', manual: 'Added by you' }
  return (
    <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground bg-muted/50">
      {labels[source] ?? source}
    </span>
  )
}

function StatusChip({ status, jobId, onUpdate }: { status: string | null; jobId: string; onUpdate: (jobId: string, status: string) => void }) {
  const [open, setOpen] = useState(false)
  const options = ['saved', 'applied', 'interviewing', 'offered', 'rejected']
  const colors: Record<string, string> = {
    saved: 'bg-slate-100 text-slate-700 border-slate-200',
    applied: 'bg-blue-100 text-blue-700 border-blue-200',
    interviewing: 'bg-purple-100 text-purple-700 border-purple-200',
    offered: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }

  async function handleSelect(newStatus: string) {
    setOpen(false)
    onUpdate(jobId, newStatus)
    await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, status: newStatus }),
    })
  }

  const current = status ?? ''
  return (
    <div className="relative" onClick={e => e.stopPropagation()} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-xs rounded-full px-2.5 py-1 font-medium border cursor-pointer ${
          current ? colors[current] : 'bg-muted text-muted-foreground border-muted-foreground/20 hover:border-muted-foreground/40'
        }`}
      >
        {current ? current.charAt(0).toUpperCase() + current.slice(1) : 'Track ▾'}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 bg-background border rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 z-20 min-w-[130px]">
          {options.map(o => (
            <button
              key={o}
              onClick={() => handleSelect(o)}
              className={`text-xs px-3 py-1.5 rounded-lg text-left transition-colors hover:bg-muted whitespace-nowrap ${
                current === o ? 'font-semibold bg-muted' : 'text-foreground'
              }`}
            >
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
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
      toast.info("Couldn't fetch automatically — paste the job description below.")
      return
    }
    if (!res.ok) { toast.error(data.error ?? 'Import failed.'); setImporting(false); return }
    toast.success(`Added: ${data.title}`)
    setOpen(false); setUrl(''); setManualText('')
    fetch('/api/matches').then(r => r.json()).then(d => { if (d.matches?.length) onAdded(d.matches[0]) })
    setImporting(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-lg leading-none">+</span> Add a job you found yourself
      </button>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Add from LinkedIn, Indeed, or anywhere</p>
        <button onClick={() => { setOpen(false); setNeedsManual(false) }} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
      </div>
      <input type="url" value={url} onChange={e => setUrl(e.target.value)}
        placeholder="https://www.linkedin.com/jobs/view/..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {needsManual && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Couldn&apos;t fetch automatically — paste the job description:</p>
          <textarea value={manualText} onChange={e => setManualText(e.target.value)} rows={5}
            placeholder="Paste the full job description here…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={handleImport} disabled={importing || (!url.trim() && !manualText.trim())} size="sm" className="flex-1">
          {importing ? 'Analysing…' : 'Import and score'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setNeedsManual(false) }}>Cancel</Button>
      </div>
    </div>
  )
}

function FeedbackButtons({ matchId, feedback, onFeedback }: {
  matchId: string
  feedback: number | null
  onFeedback: (matchId: string, value: number | null) => void
}) {
  async function handleFeedback(e: React.MouseEvent, value: number) {
    e.stopPropagation()
    const next = feedback === value ? null : value
    onFeedback(matchId, next)
    await fetch(`/api/matches/${matchId}/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: next }),
    })
  }

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button
        title="This score looks right"
        onClick={e => handleFeedback(e, 1)}
        className={`rounded-full p-1 transition-colors text-sm leading-none ${
          feedback === 1
            ? 'bg-green-100 text-green-700'
            : 'text-muted-foreground/50 hover:text-green-600 hover:bg-green-50'
        }`}
      >
        👍
      </button>
      <button
        title="This score seems off"
        onClick={e => handleFeedback(e, -1)}
        className={`rounded-full p-1 transition-colors text-sm leading-none ${
          feedback === -1
            ? 'bg-red-100 text-red-700'
            : 'text-muted-foreground/50 hover:text-red-600 hover:bg-red-50'
        }`}
      >
        👎
      </button>
    </div>
  )
}

function JobCard({ match, onMarkViewed, onUpdateStatus, onFeedback }: {
  match: Match
  onMarkViewed: (matchId: string, jobId: string) => void
  onUpdateStatus: (jobId: string, status: string) => void
  onFeedback: (matchId: string, value: number | null) => void
}) {
  const job = match.jobs
  if (!job) return null

  return (
    <div
      className="group rounded-2xl border bg-card hover:border-primary/20 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
      onClick={() => onMarkViewed(match.id, job.id)}
    >
      {!match.user_viewed && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/30" />
      )}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <CompanyLogo company={job.company ?? 'Company'} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-snug">{job.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.company ?? 'Unknown company'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.location ?? 'Location unknown'}{job.is_remote ? ' · Remote' : ''}
                </p>
              </div>
              <ScoreBadge score={match.fit_score} />
            </div>
          </div>
        </div>

        {(job.salary_min || job.salary_max) && (
          <p className="text-xs font-medium text-foreground/70 mb-2">
            €{job.salary_min?.toLocaleString()} – €{job.salary_max?.toLocaleString()}
          </p>
        )}

        {match.fit_explanation && (
          <p className="text-sm leading-relaxed text-foreground/75 border-t pt-3 mb-3">
            {match.fit_explanation}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={job.source} />
          {!match.user_viewed && (
            <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium border border-primary/20">New</span>
          )}
          <StatusChip status={match.application_status} jobId={job.id} onUpdate={onUpdateStatus} />
          <FeedbackButtons matchId={match.id} feedback={match.user_feedback} onFeedback={onFeedback} />
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            View posting →
          </a>
        </div>
      </div>
    </div>
  )
}

type FilterKey = 'all' | 'new' | 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected'

export default function MatchesPage() {
  const router = useRouter()
  const { tr } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [followUps, setFollowUps] = useState<Match[]>([])

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(data => {
        const all: Match[] = data.matches ?? []
        setMatches(all)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 14)
        setFollowUps(all.filter(m =>
          m.application_status === 'applied' && new Date(m.batch_date) < cutoff
        ))
      })
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

  function updateFeedback(matchId: string, value: number | null) {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, user_feedback: value } : m))
  }

  const unviewedCount = matches.filter(m => !m.user_viewed).length
  const lastScored = matches.reduce<string | null>((acc, m) => (!acc || m.batch_date > acc) ? m.batch_date : acc, null)

  function getFilteredMatches() {
    if (filter === 'new') return matches.filter(m => !m.user_viewed)
    if (filter === 'all') return matches
    return matches.filter(m => m.application_status === filter)
  }
  const displayedMatches = getFilteredMatches()

  function chipCount(key: FilterKey) {
    if (key === 'all') return matches.length
    if (key === 'new') return unviewedCount
    return matches.filter(m => m.application_status === key).length
  }

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'saved', label: 'Saved' },
    { key: 'applied', label: 'Applied' },
    { key: 'interviewing', label: 'Interviewing' },
    { key: 'offered', label: 'Offered' },
    { key: 'rejected', label: 'Rejected' },
  ]

  async function markAllViewed() {
    setMatches(prev => prev.map(m => ({ ...m, user_viewed: true })))
    await fetch('/api/matches/mark-all-viewed', { method: 'PATCH' }).catch(() => {})
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav backHref="/dashboard" backLabel="← Home" />

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{tr(t.matches.title)}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {matches.filter(m => m.fit_score >= 5).length} {tr(t.matches.total)}
                {unviewedCount > 0 && <> · <span className="text-primary font-medium">{unviewedCount} {tr(t.matches.new)}</span></>}
              </p>
              {lastScored && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Scored: {new Date(lastScored).toLocaleDateString('en-NL', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
            {unviewedCount > 0 && (
              <button
                onClick={markAllViewed}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0 mt-1"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        {!loading && matches.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Matches', value: matches.filter(m => m.fit_score >= 5).length, color: 'text-foreground' },
              { label: 'Applied', value: matches.filter(m => m.application_status === 'applied').length, color: 'text-blue-600' },
              { label: 'Interviewing', value: matches.filter(m => m.application_status === 'interviewing').length, color: 'text-purple-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-background rounded-xl border p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Follow-up reminders */}
        {followUps.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-900">Time to follow up 📬</p>
            {followUps.map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <p className="text-sm text-amber-800">
                  {m.jobs?.company ?? 'Unknown'} — {m.jobs?.title}
                  <span className="text-xs text-amber-600 ml-2">
                    applied {Math.floor((Date.now() - new Date(m.batch_date).getTime()) / 86400000)} days ago
                  </span>
                </p>
                <Link href={`/jobs/${m.jobs?.id}`} className="text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900 shrink-0 ml-3">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Progress motivation */}
        {!loading && matches.length > 0 && (() => {
          const applied = matches.filter(m => m.application_status === 'applied').length
          const total = matches.filter(m => m.application_status).length
          const msg = total === 0
            ? 'Click "Track ▾" on any match to start tracking your applications.'
            : applied < 5 ? `${applied} application${applied !== 1 ? 's' : ''} sent — most people land their first offer after 8–15.`
            : applied < 10 ? `${applied} applications in — great momentum. Keep going!`
            : `${applied} applications — serious work. An offer is close.`
          return (
            <div className="mb-5 rounded-xl bg-muted/50 border px-4 py-3 flex items-center gap-3">
              <span className="text-xl">🚀</span>
              <p className="text-sm text-muted-foreground">{msg}</p>
            </div>
          )
        })()}

        {/* Add job form */}
        <div className="mb-5">
          <AddJobForm onAdded={m => setMatches(prev => [m, ...prev.filter(x => x.jobs?.id !== m.jobs?.id)])} />
        </div>

        {/* Filter chips */}
        {!loading && matches.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-none -mx-1 px-1">
            {filterChips.map(chip => {
              const count = chipCount(chip.key)
              const active = filter === chip.key
              const isNew = chip.key === 'new' && count > 0 && !active
              return (
                <button
                  key={chip.key}
                  onClick={() => setFilter(chip.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : isNew
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {chip.label}{count > 0 ? ` · ${count}` : ''}
                </button>
              )
            })}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border bg-card p-5 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty — no matches at all */}
        {!loading && matches.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <h2 className="font-semibold mb-1">No matches yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your first job matches will appear here. The daily scan runs every morning — check back tomorrow.
            </p>
          </div>
        )}

        {/* Empty — filter shows nothing */}
        {!loading && matches.length > 0 && displayedMatches.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === 'new'
                ? "You've seen all your matches — great work!"
                : `No jobs marked as "${filter}" yet.`}
            </p>
          </div>
        )}

        {/* Grouped match list — "All" view */}
        {!loading && displayedMatches.length > 0 && filter === 'all' && (() => {
          const strong = displayedMatches.filter(m => m.fit_score >= 8)
          const good = displayedMatches.filter(m => m.fit_score >= 6 && m.fit_score < 8)
          const moderate = displayedMatches.filter(m => m.fit_score === 5)
          const lowAll = displayedMatches.filter(m => m.fit_score < 5)
          // Show at most 1 low match (the lowest) as proof the scoring is honest
          const lowShown = lowAll.length > 0
            ? [lowAll.reduce((a, b) => a.fit_score < b.fit_score ? a : b)]
            : []
          return (
            <div className="space-y-8">
              {strong.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr(t.matches.strongMatch)} ({strong.length})</p>
                  </div>
                  <div className="space-y-3">{strong.map(m => <JobCard key={m.id} match={m} onMarkViewed={markViewed} onUpdateStatus={updateStatus} onFeedback={updateFeedback} />)}</div>
                </div>
              )}
              {good.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr(t.matches.goodMatch)} ({good.length})</p>
                  </div>
                  <div className="space-y-3">{good.map(m => <JobCard key={m.id} match={m} onMarkViewed={markViewed} onUpdateStatus={updateStatus} onFeedback={updateFeedback} />)}</div>
                </div>
              )}
              {moderate.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr(t.matches.possibleMatch)} ({moderate.length})</p>
                  </div>
                  <div className="space-y-3">{moderate.map(m => <JobCard key={m.id} match={m} onMarkViewed={markViewed} onUpdateStatus={updateStatus} onFeedback={updateFeedback} />)}</div>
                </div>
              )}
              {lowShown.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr(t.matches.notAMatch)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 ml-4">
                    {tr(t.matches.notAMatchSub).replace('{n}', String(lowAll.length)).replace('{s}', lowAll.length !== 1 ? 's' : '')}
                  </p>
                  <div className="space-y-3 opacity-60">{lowShown.map(m => <JobCard key={m.id} match={m} onMarkViewed={markViewed} onUpdateStatus={updateStatus} onFeedback={updateFeedback} />)}</div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Flat list — filtered view */}
        {!loading && displayedMatches.length > 0 && filter !== 'all' && (
          <div className="space-y-3">
            {displayedMatches.map(match => (
              <JobCard key={match.id} match={match} onMarkViewed={markViewed} onUpdateStatus={updateStatus} onFeedback={updateFeedback} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
