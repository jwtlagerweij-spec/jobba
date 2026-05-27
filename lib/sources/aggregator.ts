import { fetchAdzunaJobs, fetchAdzunaByCategory, ADZUNA_CATEGORIES, type FetchedJob } from '@/lib/fetchers/adzuna'
import { fetchIntermediairJobs } from '@/lib/fetchers/intermediair'
import { fetchJobbirdJobs } from '@/lib/fetchers/jobbird'
import { fetchNVBJobs } from '@/lib/fetchers/nvb'
import { fetchTheMuseJobs } from '@/lib/sources/themuse'
import { fetchArbeitnowJobs } from '@/lib/sources/arbeitnow'
import { fetchJoobleJobs } from '@/lib/sources/jooble'
import { fetchReedJobs } from '@/lib/sources/reed'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type { FetchedJob }

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

async function readCache(key: string): Promise<FetchedJob[] | null> {
  try {
    const { data } = await supabaseAdmin
      .from('job_cache')
      .select('results, expires_at')
      .eq('cache_key', key)
      .single()
    if (!data) return null
    if (new Date(data.expires_at) < new Date()) return null
    return data.results as FetchedJob[]
  } catch {
    return null
  }
}

async function writeCache(key: string, jobs: FetchedJob[]): Promise<void> {
  const expires_at = new Date(Date.now() + CACHE_TTL_MS).toISOString()
  try {
    await supabaseAdmin
      .from('job_cache')
      .upsert({ cache_key: key, results: jobs, expires_at }, { onConflict: 'cache_key' })
  } catch (err) {
    console.warn('job_cache write failed:', err)
  }
}

async function deleteExpiredCache(): Promise<void> {
  try {
    await supabaseAdmin
      .from('job_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
  } catch {
    // non-critical
  }
}

// Deduplicate by external_id:source, then by normalized title+company (cross-source)
export function deduplicate(jobs: FetchedJob[]): FetchedJob[] {
  // Sort newest first so we keep the most recent duplicate
  const sorted = [...jobs].sort((a, b) => {
    if (!a.posted_at && !b.posted_at) return 0
    if (!a.posted_at) return 1
    if (!b.posted_at) return -1
    return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
  })

  const seenId = new Set<string>()
  const seenTitleCompany = new Set<string>()

  return sorted.filter(j => {
    const idKey = `${j.external_id}:${j.source}`
    if (seenId.has(idKey)) return false
    seenId.add(idKey)

    // Cross-source dedup: same title+company = same job posted on multiple boards
    if (j.title && j.company) {
      const tcKey = `${j.title.toLowerCase().replace(/[^a-z0-9]/g, '')}:${j.company.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      if (seenTitleCompany.has(tcKey)) return false
      seenTitleCompany.add(tcKey)
    }

    return true
  })
}

// Run all term-based sources in parallel for a single search term, with 30-min cache
export async function aggregateByTerm(term: string, location?: string): Promise<FetchedJob[]> {
  const cacheKey = `term_${term.toLowerCase().trim()}_${(location ?? 'nl').toLowerCase()}`

  const cached = await readCache(cacheKey)
  if (cached) return cached

  const sources = await Promise.allSettled([
    fetchAdzunaJobs(term, location, 'job'),
    fetchIntermediairJobs(term),
    fetchJobbirdJobs(term),
    fetchNVBJobs(term),
    fetchJoobleJobs(term, location ?? 'Nederland'),
    fetchReedJobs(term, location ?? 'Netherlands'),
  ])

  const jobs = deduplicate(
    sources.flatMap(r => r.status === 'fulfilled' ? (r.value as FetchedJob[]) : [])
  )

  await writeCache(cacheKey, jobs)
  return jobs
}

// Broad market crawl: fetch by Adzuna categories + RSS + The Muse + Arbeitnow
// Used by the global crawl cron — no specific search term needed
export async function aggregateBroadMarket(maxDaysOld = 2): Promise<FetchedJob[]> {
  // Clean up expired cache entries at the start of each crawl
  await deleteExpiredCache()

  // 1. Adzuna by category (batched to respect rate limits)
  const CATEGORY_BATCH = 4
  const adzunaJobs: FetchedJob[] = []
  for (let i = 0; i < ADZUNA_CATEGORIES.length; i += CATEGORY_BATCH) {
    const batch = ADZUNA_CATEGORIES.slice(i, i + CATEGORY_BATCH)
    const results = await Promise.allSettled(
      batch.map(cat => fetchAdzunaByCategory(cat, maxDaysOld))
    )
    adzunaJobs.push(...results.flatMap(r => r.status === 'fulfilled' ? r.value : []))
  }

  // 2. RSS feeds with broad Dutch sector terms
  const RSS_TERMS = [
    'psycholoog', 'maatschappelijk werker', 'docent', 'leraar', 'rector',
    'verpleegkundige', 'jurist', 'HR adviseur', 'recruiter', 'teamleider',
    'zorgmanager', 'beleidsmedewerker', 'adviseur', 'coordinator',
  ]
  const rssResults = await Promise.allSettled(
    RSS_TERMS.flatMap(term => [
      fetchIntermediairJobs(term),
      fetchJobbirdJobs(term),
      fetchNVBJobs(term),
    ])
  )
  const rssJobs = rssResults.flatMap(r => r.status === 'fulfilled' ? (r.value as FetchedJob[]) : [])

  // 3. Free keyless APIs
  const [museResult, arbeitnowResult] = await Promise.allSettled([
    fetchTheMuseJobs(),
    fetchArbeitnowJobs(undefined, 3),
  ])
  const freeJobs = [
    ...(museResult.status === 'fulfilled' ? museResult.value : []),
    ...(arbeitnowResult.status === 'fulfilled' ? arbeitnowResult.value : []),
  ]

  return deduplicate([...adzunaJobs, ...rssJobs, ...freeJobs])
}
