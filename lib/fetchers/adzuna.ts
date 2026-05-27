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

async function fetchAdzunaPage(searchTerm: string, location: string | undefined, jobType: string, page: number, maxDaysOld?: number): Promise<FetchedJob[]> {
  const params: Record<string, string> = {
    app_id: APP_ID,
    app_key: APP_KEY,
    results_per_page: '50',
    what: buildSearchTerm(searchTerm, jobType),
  }

  if (location && location.toLowerCase() !== 'netherlands' && location.toLowerCase() !== 'nederland') {
    params.where = location
  }

  if (maxDaysOld) {
    params.max_days_old = String(maxDaysOld)
  }

  const url = `https://api.adzuna.com/v1/api/jobs/nl/search/${page}?${new URLSearchParams(params)}`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    console.error(`Adzuna error for "${searchTerm}" page ${page}: ${res.status}`)
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

export async function fetchAdzunaJobs(searchTerm: string, location?: string, jobType = 'job', maxDaysOld?: number): Promise<FetchedJob[]> {
  if (!APP_ID || !APP_KEY) {
    return []
  }

  const [page1, page2] = await Promise.all([
    fetchAdzunaPage(searchTerm, location, jobType, 1, maxDaysOld),
    fetchAdzunaPage(searchTerm, location, jobType, 2, maxDaysOld).catch(() => [] as FetchedJob[]),
  ])

  return [...page1, ...page2]
}

// Adzuna category slugs for the NL market
export const ADZUNA_CATEGORIES = [
  'education',
  'healthcare-nursing',
  'social-work',
  'legal',
  'hr-recruitment',
  'teaching',
  'scientific-qa',
  'accounting-finance',
  'marketing-pr-advertising',
  'it-jobs',
  'consultancy',
  'engineering',
  'sales',
  'admin-secretarial',
  'customer-services',
  'graduate',
  'logistics-warehouse',
  'manufacturing',
  'property',
  'voluntary-charity',
] as const

export type AdzunaCategory = typeof ADZUNA_CATEGORIES[number]

async function fetchAdzunaCategoryPage(category: string, page: number, maxDaysOld?: number): Promise<FetchedJob[]> {
  const params: Record<string, string> = {
    app_id: APP_ID,
    app_key: APP_KEY,
    results_per_page: '50',
    category,
  }
  if (maxDaysOld) params.max_days_old = String(maxDaysOld)

  const url = `https://api.adzuna.com/v1/api/jobs/nl/search/${page}?${new URLSearchParams(params)}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    console.error(`Adzuna category "${category}" page ${page}: ${res.status}`)
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

export async function fetchAdzunaByCategory(category: AdzunaCategory, maxDaysOld?: number): Promise<FetchedJob[]> {
  if (!APP_ID || !APP_KEY) return []
  const pages = await Promise.allSettled([
    fetchAdzunaCategoryPage(category, 1, maxDaysOld),
    fetchAdzunaCategoryPage(category, 2, maxDaysOld),
    fetchAdzunaCategoryPage(category, 3, maxDaysOld),
  ])
  return pages.flatMap(p => p.status === 'fulfilled' ? p.value : [])
}
