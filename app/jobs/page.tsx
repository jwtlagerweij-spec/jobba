'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Search, ChevronDown } from 'lucide-react'
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
  { id: 'all',        label: 'All sectors' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'data',       label: 'Data & Analytics' },
  { id: 'ai-tech',    label: 'AI & Tech' },
  { id: 'strategy',   label: 'Strategy & Product' },
  { id: 'other',      label: 'Other' },
]

const SOURCE_LABELS: Record<string, string> = {
  adzuna: 'Adzuna', nvb: 'NVB', intermediair: 'Intermediair', jobbird: 'Jobbird', manual: 'Added by you',
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-100 text-green-700 border-green-200'
    : score >= 6 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`text-xs font-bold border rounded-full px-2 py-0.5 ${color}`}>
      {score}/10
    </span>
  )
}

function daysAgo(dateStr: string | null, lang: 'en' | 'nl'): string {
  if (!dateStr) return ''
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return lang === 'nl' ? 'Vandaag' : 'Today'
  if (days === 1) return lang === 'nl' ? 'Gisteren' : 'Yesterday'
  return lang === 'nl' ? `${days}d geleden` : `${days}d ago`
}

export default function JobBoardPage() {
  const { lang, tr } = useLanguage()
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [sector, setSector] = useState('all')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [sort, setSort] = useState<'date' | 'score'>('date')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sectorsOpen, setSectorsOpen] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pageSize = 20

  const fetchJobs = useCallback(async (
    sec: string, remote: boolean, p: number, q: string, s: string
  ) => {
    setLoading(true)
    const params = new URLSearchParams({
      category: sec,
      type: remote ? 'remote' : 'all',
      page: String(p),
      sort: s,
    })
    if (q) params.set('search', q)
    const res = await fetch(`/api/jobs/public?${params}`)
    const data = await res.json()
    setJobs(data.jobs ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Wait for auth check before initial fetch so we can use the right sort default
    fetch('/api/resume/text').then(r => {
      const loggedIn = r.ok
      setIsLoggedIn(loggedIn)
      const initialSort: 'date' | 'score' = loggedIn ? 'score' : 'date'
      setSort(initialSort)
      fetchJobs('all', false, 1, '', initialSort)
    })
  }, [])

  function handleSearchChange(val: string) {
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchJobs(sector, remoteOnly, 1, val, sort)
    }, 400)
  }

  function handleSector(s: string) {
    setSector(s)
    setPage(1)
    fetchJobs(s, remoteOnly, 1, search, sort)
  }

  function handleRemote(checked: boolean) {
    setRemoteOnly(checked)
    setPage(1)
    fetchJobs(sector, checked, 1, search, sort)
  }

  function handleSort(s: 'date' | 'score') {
    setSort(s)
    setPage(1)
    fetchJobs(sector, remoteOnly, 1, search, s)
  }

  function handlePage(p: number) {
    setPage(p)
    fetchJobs(sector, remoteOnly, p, search, sort)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / pageSize)
  const hasScores = jobs.some(j => j.fit_score !== null)
  const activeSectorLabel = SECTORS.find(s => s.id === sector)?.label ?? 'All sectors'

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav
        right={!isLoggedIn ? (
          <>
            <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </>
        ) : undefined}
      />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{tr(t.jobs.title)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} {lang === 'nl' ? 'vacatures' : 'jobs'} · {isLoggedIn ? tr(t.jobs.sortedByFit) : tr(t.jobs.signInForScore)}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={tr(t.jobs.searchPlaceholder)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Sectors toggle */}
          <button
            onClick={() => setSectorsOpen(o => !o)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              sector !== 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground hover:border-foreground/40'
            }`}
          >
            {sector !== 'all' ? activeSectorLabel : tr(t.jobs.sectors)}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${sectorsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Remote only toggle */}
          <button
            onClick={() => handleRemote(!remoteOnly)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              remoteOnly
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground hover:border-foreground/40'
            }`}
          >
            {tr(t.jobs.remoteOnly)}
          </button>

          {/* Sort toggle — logged-in only */}
          {isLoggedIn && (
            <div className="ml-auto flex rounded-lg border overflow-hidden">
              <button
                onClick={() => handleSort('score')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${sort === 'score' ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground'}`}
              >
                {tr(t.jobs.bestMatch)}
              </button>
              <button
                onClick={() => handleSort('date')}
                className={`px-3 py-1.5 text-xs font-medium border-l transition-colors ${sort === 'date' ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground'}`}
              >
                {tr(t.jobs.newest)}
              </button>
            </div>
          )}
        </div>

        {/* Sector chips — expands below */}
        {sectorsOpen && (
          <div className="bg-background border rounded-xl p-4 mb-4 flex flex-wrap gap-2">
            {SECTORS.map(s => (
              <button
                key={s.id}
                onClick={() => { handleSector(s.id); setSectorsOpen(false) }}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  sector === s.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground hover:border-foreground/60 hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
            <p className="text-muted-foreground text-sm">
              {search ? tr(t.jobs.noResults).replace('{q}', search) : tr(t.jobs.noJobs)}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Link
                key={job.id}
                href={isLoggedIn ? `/jobs/${job.id}` : '/signup'}
                className="block rounded-2xl border bg-card hover:border-foreground/20 hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <CompanyLogo company={job.company ?? 'Company'} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm leading-snug">{job.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.company ?? 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {job.location ?? 'Netherlands'}{job.is_remote ? ' · Remote' : ''}
                          </p>
                        </div>
                        {job.fit_score !== null ? (
                          <ScorePill score={job.fit_score} />
                        ) : !isLoggedIn ? (
                          <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground whitespace-nowrap">
                            {tr(t.jobs.signInForScoreBtn)}
                          </span>
                        ) : hasScores ? (
                          <span className="text-xs text-muted-foreground/50 whitespace-nowrap">—</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {(job.salary_min || job.salary_max) && (
                      <span className="text-xs text-muted-foreground">
                        €{job.salary_min?.toLocaleString()} – €{job.salary_max?.toLocaleString()}
                      </span>
                    )}
                    <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground bg-muted/50">
                      {SOURCE_LABELS[job.source] ?? job.source}
                    </span>
                    {job.posted_at && (
                      <span className="text-xs text-muted-foreground ml-auto">{daysAgo(job.posted_at, lang)}</span>
                    )}
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
              onClick={() => handlePage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}

        {/* CTA for logged out users */}
        {!isLoggedIn && (
          <div className="mt-10 rounded-2xl bg-foreground text-background p-8 text-center">
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
      </main>
    </div>
  )
}
