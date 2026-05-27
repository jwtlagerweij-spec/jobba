import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'
import type { FetchedJob } from '@/lib/fetchers/adzuna'

interface ArbeitnowJob {
  slug: string
  title: string
  location: string
  remote: boolean
  tags: string[]
  url: string
  created_at: number
  description: string
  company_name: string
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[]
  links: { next?: string }
  meta: { current_page: number; last_page: number }
}

function normalizeJob(job: ArbeitnowJob): FetchedJob {
  return {
    external_id: `arbeitnow-${job.slug}`,
    source: 'arbeitnow',
    title: job.title,
    company: job.company_name ?? null,
    location: job.location ?? null,
    description: job.description ?? null,
    url: job.url,
    salary_min: null,
    salary_max: null,
    posted_at: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
    category: assignCategory(job.title, job.description ?? ''),
    is_remote: job.remote || detectRemote(job.title, job.description ?? ''),
    language: detectLanguage(job.description ?? ''),
  }
}

async function fetchArbeitnowPage(page: number): Promise<ArbeitnowResponse | null> {
  const url = `https://www.arbeitnow.com/api/job-board-api?page=${page}`
  const res = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(10000) })
  if (!res.ok) {
    console.warn(`Arbeitnow API error page ${page}: ${res.status}`)
    return null
  }
  return res.json()
}

export async function fetchArbeitnowJobs(searchTerm?: string, pages = 2): Promise<FetchedJob[]> {
  const pageNums = Array.from({ length: pages }, (_, i) => i + 1)
  const results = await Promise.allSettled(pageNums.map(p => fetchArbeitnowPage(p)))

  const allJobs = results.flatMap(r => {
    if (r.status !== 'fulfilled' || !r.value) return []
    return r.value.data.map(normalizeJob)
  })

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    return allJobs.filter(j =>
      j.title.toLowerCase().includes(term) ||
      (j.description ?? '').toLowerCase().includes(term) ||
      (j.location ?? '').toLowerCase().includes(term)
    )
  }

  return allJobs
}
