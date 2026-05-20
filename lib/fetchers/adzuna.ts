import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'

const APP_ID = process.env.ADZUNA_APP_ID!
const APP_KEY = process.env.ADZUNA_APP_KEY!

interface AdzunaJob {
  id: string
  title: string
  company: { display_name: string }
  location: { display_name: string }
  description: string
  redirect_url: string
  salary_min?: number
  salary_max?: number
  created: string
}

export interface FetchedJob {
  external_id: string
  source: string
  title: string
  company: string | null
  location: string | null
  description: string | null
  url: string
  salary_min: number | null
  salary_max: number | null
  posted_at: string | null
  category: string
  is_remote: boolean
  language: string
}

function buildSearchTerm(term: string, jobType: string): string {
  if (jobType === 'internship') return `${term} stage OR stagiair OR internship`
  if (jobType === 'traineeship') return `${term} traineeship OR trainee OR graduate`
  return term
}

export async function fetchAdzunaJobs(searchTerm: string, location?: string, jobType = 'job'): Promise<FetchedJob[]> {
  if (!APP_ID || !APP_KEY) {
    console.warn('Adzuna API credentials not configured')
    return []
  }

  const params: Record<string, string> = {
    app_id: APP_ID,
    app_key: APP_KEY,
    results_per_page: '50',
    what: buildSearchTerm(searchTerm, jobType),
  }

  // Only pass location if it's a specific city, not a country-level default
  if (location && location.toLowerCase() !== 'netherlands' && location.toLowerCase() !== 'nederland') {
    params.where = location
  }

  const url = `https://api.adzuna.com/v1/api/jobs/nl/search/1?${new URLSearchParams(params)}`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    console.error(`Adzuna error for "${searchTerm}": ${res.status}`)
    return []
  }

  const data: { results: AdzunaJob[] } = await res.json()

  return (data.results || []).map(job => ({
    external_id: job.id,
    source: 'adzuna' as const,
    title: job.title,
    company: job.company?.display_name ?? null,
    location: job.location?.display_name ?? null,
    description: job.description ?? null,
    url: job.redirect_url,
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    posted_at: job.created ?? null,
    category: assignCategory(job.title, job.description ?? ''),
    is_remote: detectRemote(job.title, job.description ?? ''),
    language: detectLanguage(job.description ?? ''),
  }))
}
