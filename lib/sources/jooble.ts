import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'
import type { FetchedJob } from '@/lib/fetchers/adzuna'

const API_KEY = process.env.JOOBLE_API_KEY

interface JoobleJob {
  id?: string
  title: string
  location: string
  snippet: string
  salary: string
  source: string
  type: string
  link: string
  updated: string
  company?: string
}

interface JoobleResponse {
  totalCount?: number
  jobs: JoobleJob[]
}

function normalizeJob(job: JoobleJob): FetchedJob {
  const salaryMatch = job.salary?.match(/(\d[\d.,]+)/g)
  const salary_min = salaryMatch?.[0] ? parseFloat(salaryMatch[0].replace(',', '')) : null
  const salary_max = salaryMatch?.[1] ? parseFloat(salaryMatch[1].replace(',', '')) : null

  const idBase = job.id ?? job.link
  return {
    external_id: `jooble-${Buffer.from(idBase).toString('base64url').slice(0, 80)}`,
    source: 'jooble',
    title: job.title,
    company: job.company ?? null,
    location: job.location ?? null,
    description: job.snippet ?? null,
    url: job.link,
    salary_min,
    salary_max,
    posted_at: job.updated ? new Date(job.updated).toISOString() : null,
    category: assignCategory(job.title, job.snippet ?? ''),
    is_remote: detectRemote(job.title, job.snippet ?? ''),
    language: detectLanguage(job.snippet ?? ''),
  }
}

async function fetchJooblePage(keywords: string, location: string, page: number): Promise<FetchedJob[]> {
  if (!API_KEY) return []

  const body = JSON.stringify({ keywords, location, page })
  const res = await fetch(`https://jooble.org/api/${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) {
    console.warn(`Jooble API error for "${keywords}": ${res.status}`)
    return []
  }

  const data: JoobleResponse = await res.json()
  return (data.jobs ?? []).map(normalizeJob)
}

export async function fetchJoobleJobs(keywords: string, location = 'Nederland'): Promise<FetchedJob[]> {
  if (!API_KEY) {
    console.warn('JOOBLE_API_KEY not set — skipping Jooble source')
    return []
  }

  const [page1, page2] = await Promise.allSettled([
    fetchJooblePage(keywords, location, 1),
    fetchJooblePage(keywords, location, 2),
  ])

  return [
    ...(page1.status === 'fulfilled' ? page1.value : []),
    ...(page2.status === 'fulfilled' ? page2.value : []),
  ]
}
