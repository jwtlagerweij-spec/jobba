'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Search, X, Check, SlidersHorizontal } from 'lucide-react'
import { CompanyLogo } from '@/components/ui/company-logo'
import { AppNav } from '@/components/ui/app-nav'
import { useLanguage, t } from '@/lib/language-context'

interface PublicJob {
  id: string
  title: string
  company: string | null
  location: string | null
  salary_min: number | null
  salary_max: number | null
  source: string
  is_remote: boolean
  posted_at: string | null
  category: string
  fit_score: number | null
}

const SECTORS = [
  { id: 'all', label: 'All sectors' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'data', label: 'Data & Analytics' },
  { id: 'ai-tech', label: 'AI & Tech' },
  { id: 'strategy', label: 'Strategy & Product' },
  { id: 'other', label: 'Other' },
]

const SOURCE_LABELS: Record<string, string> = {
  adzuna: 'Adzuna',
  nvb: 'NVB',
  intermediair: 'Intermediair',
  jobbird: 'Jobbird',
  manual: 'Manual',
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? 'bg-green-100 text-green-700 border-green-200'
      : score >= 6
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`text-xs font-bold border rounded-full px-2.5 py-0.5 shrink-0 tabular-nums ${color}`}>
      {score}/10
    </span>
  )
}

function daysOld(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function daysAgoLabel(dateStr: string | null, lang: 'en' | 'nl'): string {
  if (!dateStr) return ''
  const days = daysOld(dateStr)
  if (days === 0) return lang === 'nl' ? 'Vandaag' : 'Today'
  if (days === 1) return lang === 'nl' ? 'Gisteren' : 'Yesterday'
  return lang === 'nl' ? `${days}d geleden` : `${days}d ago`
}

function JobCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 animate-pulse">
      <div className="flex gap-3 items-start">
        <div className="w-11 h-11 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2.5 pt-0.5">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-2/5" />
        </div>
      </div>
    </div>
  )
}

function FilterSidebar({
  sector,
  remote,
  sort,
  isLoggedIn,
  updateParams,
}: {
  sector: string
  remote: boolean
  sort: string
  isLoggedIn: boolean
  updateParams: (updates: Record<string, string | null>, resetPage?: boolean) => void
}) {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Sector
        </p>
        <div className="space-y-0.5">
          {SECTORS.map(s => {
            const active = sector === s.id || (s.id === 'all' && sector === 'all')
            return (
              <button
                key={s.id}
                onClick={() => updateParams({ sector: s.id === 'all' ? null : s.id })}
                className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {s.label}
                {active && s.id !== 'all' && <Check size={13} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Work type
        </p>
        <button
          onClick={() => updateParams({ remote: remote ? null : '1' })}
          className="w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors hover:bg-muted"
        >
          <span
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
              remote ? 'bg-primary border-primary' : 'border-border bg-background'
            }`}
          >
            {remote && <Check size={10} className="text-primary-foreground" />}
          </span>
          <span className={remote ? 'text-primary font-medium' : 'text-muted-foreground'}>
            Remote only
          </span>
        </button>
      </div>

      {isLoggedIn && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Sort by
          </p>
          <div className="space-y-0.5">
            {[
              { id: 'score', label: 'Best match' },
              { id: 'date', label: 'Newest first' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => updateParams({ sort: opt.id }, false)}
                className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                  sort === opt.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
                {sort === opt.id && <Check size={13} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function JobBoardInner() {
  const { lang, tr } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const q = searchParams.get('q') ?? ''
  const sector = searchParams.get('sector') ?? 'all'
  const remote = searchParams.get('remote') === '1'
  const sort = (searchParams.get('sort') ?? 'date') as 'date' | 'score'
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(q)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const authChecked = useRef(false)

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    if (resetPage) next.delete('page')
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (authChecked.current) return
    authChecked.current = true
    fetch('/api/resume/text').then(r => {
      const loggedIn = r.ok
      setIsLoggedIn(loggedIn)
      if (loggedIn && !searchParams.get('sort')) {
        const next = new URLSearchParams(searchParams.toString())
        next.set('sort', 'score')
        router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      category: sector,
      type: remote ? 'remote' : 'all',
      page: String(page),
      sort,
    })
    if (q) params.set('search', q)
    fetch(`/api/jobs/public?${params}`)
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs ?? [])
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [q, sector, remote, sort, page])

  function handleSearchChange(val: string) {
    setLocalSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      updateParams({ q: val || null })
    }, 300)
  }

  const activeFilters: { key: string; label: string }[] = []
  if (sector !== 'all') {
    const label = SECTORS.find(s => s.id === sector)?.label ?? sector
    activeFilters.push({ key: 'sector', label })
  }
  if (remote) activeFilters.push({ key: 'remote', label: 'Remote only' })

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)
  const hasScores = jobs.some(j => j.fit_score !== null)
  const backUrl = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '')

  return (
    <div className="min-h-screen bg-background">
      <AppNav
        right={
          !isLoggedIn ? (
            <>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Get started
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-[4.5rem]">
              <FilterSidebar
                sector={sector}
                remote={remote}
                sort={sort}
                isLoggedIn={isLoggedIn}
                updateParams={updateParams}
              />
            </div>
          </aside>

          {/* Main column */}
          <div className="flex-1 min-w-0">
            {/* Page header */}
            <div className="mb-5">
              <h1 className="text-2xl font-bold">{tr(t.jobs.title)}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {total > 0 ? (
                  <>
                    <span className="font-medium text-foreground">{total.toLocaleString()}</span>{' '}
                    {lang === 'nl' ? 'vacatures' : 'jobs'} ·{' '}
                  </>
                ) : null}
                {isLoggedIn ? tr(t.jobs.sortedByFit) : tr(t.jobs.signInForScore)}
              </p>
            </div>

            {/* Search bar */}
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                id="job-search"
                aria-label="Search jobs"
                value={localSearch}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={tr(t.jobs.searchPlaceholder)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch('')
                    updateParams({ q: null })
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile filter bar */}
            <div className="flex items-center gap-2 mb-4 lg:hidden flex-wrap">
              <button
                onClick={() => setMobileFiltersOpen(o => !o)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeFilters.length > 0
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                <SlidersHorizontal size={13} />
                Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
              </button>

              {isLoggedIn && (
                <div className="ml-auto flex rounded-lg border bg-background overflow-hidden">
                  <button
                    onClick={() => updateParams({ sort: 'score' }, false)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      sort === 'score'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tr(t.jobs.bestMatch)}
                  </button>
                  <button
                    onClick={() => updateParams({ sort: 'date' }, false)}
                    className={`px-3 py-1.5 text-xs font-medium border-l transition-colors ${
                      sort === 'date'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tr(t.jobs.newest)}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile filter panel */}
            {mobileFiltersOpen && (
              <div className="lg:hidden rounded-xl border bg-card p-5 mb-4">
                <FilterSidebar
                  sector={sector}
                  remote={remote}
                  sort={sort}
                  isLoggedIn={isLoggedIn}
                  updateParams={(updates, resetPage) => {
                    updateParams(updates, resetPage)
                    setMobileFiltersOpen(false)
                  }}
                />
              </div>
            )}

            {/* Active filter pills */}
            {(activeFilters.length > 0 || q) && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {activeFilters.map(f => (
                  <span
                    key={f.key}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-2.5 py-1"
                  >
                    {f.label}
                    <button
                      onClick={() => updateParams({ [f.key]: null })}
                      aria-label={`Remove ${f.label} filter`}
                      className="hover:opacity-70 transition-opacity leading-none"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {q && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-foreground border text-xs font-medium px-2.5 py-1">
                    &ldquo;{q}&rdquo;
                    <button
                      onClick={() => {
                        setLocalSearch('')
                        updateParams({ q: null })
                      }}
                      aria-label="Remove search filter"
                      className="hover:opacity-70 transition-opacity leading-none"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setLocalSearch('')
                    updateParams({ sector: null, remote: null, q: null })
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-12 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <p className="font-medium mb-1">
                  {q ? 'No results found' : tr(t.jobs.noJobs)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {q
                    ? tr(t.jobs.noResults).replace('{q}', q)
                    : 'Check back soon — new jobs are added daily.'}
                </p>
                {(activeFilters.length > 0 || q) && (
                  <button
                    onClick={() => {
                      setLocalSearch('')
                      updateParams({ sector: null, remote: null, q: null })
                    }}
                    className="mt-4 text-sm text-primary hover:opacity-75 font-medium transition-opacity"
                  >
                    Clear all filters →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {jobs.map(job => (
                  <Link
                    key={job.id}
                    href={
                      isLoggedIn
                        ? `/jobs/${job.id}?back=${encodeURIComponent(backUrl)}`
                        : '/signup'
                    }
                    className="block rounded-xl border bg-card hover:border-foreground/20 hover:shadow-sm transition-all duration-150"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <CompanyLogo company={job.company ?? 'Company'} size={44} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm leading-snug">{job.title}</h3>
                              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                {job.company ?? 'Unknown'} · {job.location ?? 'Netherlands'}
                                {job.is_remote ? ' · Remote' : ''}
                              </p>
                            </div>
                            {job.fit_score !== null ? (
                              <ScoreBadge score={job.fit_score} />
                            ) : !isLoggedIn ? (
                              <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground whitespace-nowrap shrink-0">
                                {tr(t.jobs.signInForScoreBtn)}
                              </span>
                            ) : hasScores ? (
                              <span className="text-xs text-muted-foreground/40 whitespace-nowrap shrink-0 tabular-nums">
                                —
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            {(job.salary_min || job.salary_max) && (
                              <span className="text-xs font-medium text-foreground/70">
                                €{job.salary_min?.toLocaleString()} –{' '}
                                €{job.salary_max?.toLocaleString()}
                              </span>
                            )}
                            <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground bg-muted/30">
                              {SOURCE_LABELS[job.source] ?? job.source}
                            </span>
                            {job.posted_at && (
                              daysOld(job.posted_at) > 21 ? (
                                <span className="text-xs ml-auto font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                  ⚠ {daysAgoLabel(job.posted_at, lang)} — may be filled
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {daysAgoLabel(job.posted_at, lang)}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => updateParams({ page: String(page - 1) }, false)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => updateParams({ page: String(page + 1) }, false)}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}

            {/* CTA for logged-out */}
            {!isLoggedIn && (
              <div className="mt-10 rounded-xl bg-foreground text-background p-8 text-center">
                <h2 className="text-lg font-bold mb-2">{tr(t.jobs.ctaTitle)}</h2>
                <p className="text-sm opacity-80 mb-4">{tr(t.jobs.ctaBody)}</p>
                <Link
                  href="/signup"
                  className="inline-block bg-background text-foreground rounded-lg px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {tr(t.jobs.ctaBtn)}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JobBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex gap-10">
              <div className="hidden lg:block w-48 shrink-0" />
              <div className="flex-1 space-y-2.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-5 animate-pulse h-24" />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <JobBoardInner />
    </Suspense>
  )
}
