'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CompanyLogo } from '@/components/ui/company-logo'
import { AppNav } from '@/components/ui/app-nav'
import { useLanguage, t } from '@/lib/language-context'

interface TopMatch {
  id: string
  fit_score: number
  fit_explanation: string | null
  user_viewed: boolean
  batch_date: string
  job: {
    id: string
    title: string
    company: string | null
    location: string | null
    is_remote: boolean
    source: string
    url: string
    salary_min: number | null
    salary_max: number | null
  } | null
}

interface Overview {
  top_matches: TopMatch[]
  total_matches: number
  new_matches: number
  last_scored: string | null
  application_counts: Record<string, number>
  total_applications: number
  coach_pending: number
  full_name: string | null
}

const STATUS_BADGE: Record<string, string> = {
  saved: 'text-slate-600 bg-slate-50 border-slate-200',
  applied: 'text-blue-600 bg-blue-50 border-blue-200',
  interviewing: 'text-violet-600 bg-violet-50 border-violet-200',
  offered: 'text-green-600 bg-green-50 border-green-200',
  rejected: 'text-red-500 bg-red-50 border-red-200',
}

const STATUS_ORDER = ['saved', 'applied', 'interviewing', 'offered', 'rejected']

function ScoreDot({ score }: { score: number }) {
  const cls = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-amber-400' : 'bg-slate-300'
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} shrink-0`} />
}

function MatchMiniCard({
  match,
  onNavigate,
}: {
  match: TopMatch
  onNavigate: (matchId: string, jobId: string) => void
}) {
  const job = match.job
  if (!job) return null

  const scoreColor =
    match.fit_score >= 8
      ? 'bg-green-100 text-green-700 border-green-200'
      : match.fit_score >= 6
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-500 border-slate-200'

  return (
    <div
      onClick={() => onNavigate(match.id, job.id)}
      className="group rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
    >
      {!match.user_viewed && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
      )}
      <div className="p-4 flex items-center gap-3">
        <CompanyLogo company={job.company ?? 'Company'} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{job.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {job.company ?? 'Unknown'} · {job.location ?? 'Netherlands'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-bold border rounded-full px-2 py-0.5 ${scoreColor}`}>
            {match.fit_score}/10
          </span>
          {!match.user_viewed && (
            <span className="text-[10px] text-primary font-medium">New</span>
          )}
        </div>
      </div>
    </div>
  )
}

function MatchCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
      <div className="w-10 h-5 bg-muted rounded-full" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { tr } = useLanguage()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/overview')
      .then(r => r.json())
      .then(setOverview)
      .finally(() => setLoading(false))
  }, [])

  function handleMatchClick(matchId: string, jobId: string) {
    fetch(`/api/matches/${matchId}/viewed`, { method: 'PATCH' }).catch(() => {})
    router.push(`/jobs/${jobId}`)
  }

  const today = new Date().toLocaleDateString('en-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const hour = new Date().getHours()
  const greeting =
    hour < 12
      ? tr(t.dashboard.goodMorning)
      : hour < 17
      ? tr(t.dashboard.goodAfternoon)
      : tr(t.dashboard.goodEvening)

  const firstName = overview?.full_name?.split(' ')[0] ?? null

  const appCounts = overview?.application_counts ?? {}
  const activeStatuses = STATUS_ORDER.filter(s => (appCounts[s] ?? 0) > 0)

  const lastScoredLabel = overview?.last_scored
    ? new Date(overview.last_scored).toLocaleDateString('en-NL', {
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}
            {firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {today}
            {overview && overview.total_matches > 0 && (
              <>
                {' · '}
                <span className="font-medium text-foreground">{overview.total_matches}</span>{' '}
                {tr(t.dashboard.matches)}
                {overview.new_matches > 0 && (
                  <>
                    {' · '}
                    <span className="text-primary font-medium">
                      {overview.new_matches} {tr(t.dashboard.new)}
                    </span>
                  </>
                )}
                {lastScoredLabel && (
                  <>
                    {' · '}
                    {tr(t.dashboard.lastScored)} {lastScoredLabel}
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {/* Top matches */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScoreDot score={9} />
              <h2 className="text-sm font-semibold">{tr(t.dashboard.topMatches)}</h2>
            </div>
            <Link
              href="/matches"
              className="text-xs text-primary hover:opacity-75 font-medium transition-opacity"
            >
              {tr(t.dashboard.seeAll)} {overview?.total_matches ?? ''} →
            </Link>
          </div>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && (overview?.top_matches.length ?? 0) === 0 && (
            <div className="rounded-xl border border-dashed bg-card p-8 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm font-medium mb-1">{tr(t.dashboard.noMatchesYet)}</p>
              <p className="text-xs text-muted-foreground">{tr(t.dashboard.noMatchesSub)}</p>
            </div>
          )}

          {!loading && (overview?.top_matches.length ?? 0) > 0 && (
            <div className="space-y-2">
              {overview!.top_matches.map(match => (
                <MatchMiniCard key={match.id} match={match} onNavigate={handleMatchClick} />
              ))}
              {(overview?.total_matches ?? 0) > 3 && (
                <Link
                  href="/matches"
                  className="block rounded-xl border border-dashed bg-card hover:bg-muted/40 transition-colors p-3 text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  + {(overview?.total_matches ?? 0) - 3} more matches — view all →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Applications + Coach */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Applications */}
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{tr(t.dashboard.applications)}</h2>
              <Link
                href="/applications"
                className="text-xs text-primary hover:opacity-75 font-medium transition-opacity"
              >
                {tr(t.dashboard.openTracker)}
              </Link>
            </div>

            {loading && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-7 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            )}

            {!loading && overview?.total_applications === 0 && (
              <div className="py-4 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No applications tracked yet.
                  <br />
                  Save a match to start tracking.
                </p>
                <Link
                  href="/matches"
                  className="mt-3 inline-block text-xs text-primary font-medium hover:opacity-75"
                >
                  Go to your matches →
                </Link>
              </div>
            )}

            {!loading && (overview?.total_applications ?? 0) > 0 && (
              <div className="space-y-2">
                {activeStatuses.length > 0 ? (
                  activeStatuses.map(status => (
                    <div key={status} className="flex items-center justify-between">
                      <span
                        className={`text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_BADGE[status]}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                      <span className="text-sm font-bold">{appCounts[status]}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">All clear — nothing in progress.</p>
                )}
              </div>
            )}
          </section>

          {/* AI Coach */}
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{tr(t.dashboard.aiCoach)}</h2>
              <Link
                href="/coach"
                className="text-xs text-primary hover:opacity-75 font-medium transition-opacity"
              >
                {tr(t.dashboard.goToCoach)}
              </Link>
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="h-12 bg-muted rounded-lg animate-pulse" />
                <div className="h-7 bg-muted rounded-lg animate-pulse w-2/3" />
              </div>
            )}

            {!loading && (overview?.coach_pending ?? 0) === 0 && (
              <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
                <span className="text-2xl">✓</span>
                <p className="text-sm font-medium">{tr(t.dashboard.allCaughtUp)}</p>
                <p className="text-xs text-muted-foreground">{tr(t.dashboard.coachSub)}</p>
              </div>
            )}

            {!loading && (overview?.coach_pending ?? 0) > 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-primary/5 border border-primary/15 px-4 py-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {overview!.coach_pending}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {overview!.coach_pending === 1
                        ? '1 question'
                        : `${overview!.coach_pending} questions`}{' '}
                      waiting
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Answering improves your match scores
                    </p>
                  </div>
                </div>
                <Link
                  href="/coach"
                  className="block w-full rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors px-4 py-2.5 text-center text-xs font-medium text-primary"
                >
                  Answer questions →
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Browse jobs teaser */}
        <section>
          <Link
            href="/jobs"
            className="flex items-center justify-between rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all p-5 group"
          >
            <div>
              <p className="text-sm font-semibold">Browse all jobs</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Search and filter all Dutch vacancies — sorted by your fit score
              </p>
            </div>
            <span className="text-muted-foreground group-hover:text-primary transition-colors text-lg">
              →
            </span>
          </Link>
        </section>
      </main>
    </div>
  )
}
