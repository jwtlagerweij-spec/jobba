import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'
import type { FetchedJob } from '@/lib/fetchers/adzuna'

interface MuseJob {
  id: number
  name: string
  short_name: string
  publication_date: string
  short_description: string
  contents: string
  refs: { landing_page: string }
  company: { name: string }
  locations: { name: string }[]
  levels: { name: string; short_name: string }[]
  categories: { name: string; short_name: string }[]
}

interface MuseResponse {
  results: MuseJob[]
  page: number
  page_count: number
}

const MUSE_CATEGORIES = [
  'HR & Recruiting',
  'Education',
  'Healthcare',
  'Social Media & Communications',
  'Project Management',
  'Non-Profit Management',
  'Business Development',
  'Legal',
]

const MUSE_LEVELS = ['Entry Level', 'Mid Level', 'Senior Level', 'Management']

function normalizeJob(job: MuseJob): FetchedJob {
  const description = job.contents || job.short_description || null
  const location = job.locations?.[0]?.name ?? null
  return {
    external_id: `muse-${job.id}`,
    source: 'themuse',
    title: job.name,
    company: job.company?.name ?? null,
    location,
    description,
    url: job.refs?.landing_page ?? '',
    salary_min: null,
    salary_max: null,
    posted_at: job.publication_date ? new Date(job.publication_date).toISOString() : null,
    category: assignCategory(job.name, description ?? ''),
    is_remote: detectRemote(job.name, description ?? '') || (location?.toLowerCase().includes('remote') ?? false),
    language: detectLanguage(description ?? ''),
  }
}

async function fetchMusePage(category: string, page: number): Promise<FetchedJob[]> {
  const params = new URLSearchParams({
    category,
    page: String(page),
    api_key: '',
  })
  const url = `https://www.themuse.com/api/public/jobs?${params}`

  const res = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(10000) })
  if (!res.ok) {
    console.warn(`The Muse API error for category "${category}": ${res.status}`)
    return []
  }
  const data: MuseResponse = await res.json()
  return (data.results ?? []).map(normalizeJob)
}

export async function fetchTheMuseJobs(searchTerm?: string): Promise<FetchedJob[]> {
  const allJobs: FetchedJob[] = []

  // Fetch across the most relevant categories (no search term filter in free tier)
  const results = await Promise.allSettled(
    MUSE_CATEGORIES.map(cat => fetchMusePage(cat, 1))
  )

  for (const result of results) {
    if (result.status === 'fulfilled') allJobs.push(...result.value)
  }

  // Filter to relevant results if a search term is provided
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    return allJobs.filter(j =>
      j.title.toLowerCase().includes(term) ||
      (j.description ?? '').toLowerCase().includes(term)
    )
  }

  return allJobs
}
