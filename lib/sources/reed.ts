import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'
import type { FetchedJob } from '@/lib/fetchers/adzuna'

const API_KEY = process.env.REED_API_KEY

interface ReedJob {
  jobId: number
  employerId: number
  employerName: string
  jobTitle: string
  locationName: string
  minimumSalary?: number
  maximumSalary?: number
  currency?: string
  expirationDate: string
  date: string
  jobDescription: string
  applications: number
  jobUrl: string
}

interface ReedResponse {
  results: ReedJob[]
  totalResults: number
}

function normalizeJob(job: ReedJob): FetchedJob {
  return {
    external_id: `reed-${job.jobId}`,
    source: 'reed',
    title: job.jobTitle,
    company: job.employerName ?? null,
    location: job.locationName ?? null,
    description: job.jobDescription ?? null,
    url: job.jobUrl,
    salary_min: job.minimumSalary ?? null,
    salary_max: job.maximumSalary ?? null,
    posted_at: job.date ? new Date(job.date).toISOString() : null,
    category: assignCategory(job.jobTitle, job.jobDescription ?? ''),
    is_remote: detectRemote(job.jobTitle, job.jobDescription ?? ''),
    language: detectLanguage(job.jobDescription ?? ''),
  }
}

async function fetchReedPage(keywords: string, locationName: string, skip: number): Promise<FetchedJob[]> {
  if (!API_KEY) return []

  const params = new URLSearchParams({
    keywords,
    locationName,
    resultsToSkip: String(skip),
    resultsToTake: '100',
  })

  // Reed uses HTTP Basic auth: API key as username, empty password
  const credentials = Buffer.from(`${API_KEY}:`).toString('base64')
  const res = await fetch(`https://www.reed.co.uk/api/1.0/search?${params}`, {
    headers: { Authorization: `Basic ${credentials}` },
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) {
    console.warn(`Reed API error for "${keywords}": ${res.status}`)
    return []
  }

  const data: ReedResponse = await res.json()
  return (data.results ?? []).map(normalizeJob)
}

export async function fetchReedJobs(keywords: string, locationName = 'Netherlands'): Promise<FetchedJob[]> {
  if (!API_KEY) {
    console.warn('REED_API_KEY not set — skipping Reed source')
    return []
  }

  const [page1, page2] = await Promise.allSettled([
    fetchReedPage(keywords, locationName, 0),
    fetchReedPage(keywords, locationName, 100),
  ])

  return [
    ...(page1.status === 'fulfilled' ? page1.value : []),
    ...(page2.status === 'fulfilled' ? page2.value : []),
  ]
}
