import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface PublicJob {
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

export interface JobDetail {
  id: string
  title: string
  company: string | null
  location: string | null
  description: string | null
  url: string
  salary_min: number | null
  salary_max: number | null
  source: string
  is_remote: boolean
  posted_at: string | null
}

const PUBLIC_COLS =
  'id, title, company, location, salary_min, salary_max, source, is_remote, posted_at, category'

export interface ListJobsOptions {
  category?: string
  type?: 'remote' | 'all'
  page?: number
  pageSize?: number
  sort?: 'date' | 'score'
  search?: string
}

export async function listPublicJobs(
  userId: string | null,
  opts: ListJobsOptions = {}
): Promise<{ jobs: PublicJob[]; total: number }> {
  const {
    category = 'all',
    type = 'all',
    page = 1,
    pageSize = 20,
    sort = 'date',
    search = '',
  } = opts
  const offset = (page - 1) * pageSize

  if (userId && sort === 'score') {
    const { data: allScores } = await supabaseAdmin
      .from('job_matches')
      .select('job_id, fit_score')
      .eq('user_id', userId)

    const scoreMap = new Map(
      (allScores ?? []).map(m => [m.job_id as string, m.fit_score as number])
    )
    const scoredIds = [...scoreMap.keys()]

    if (scoredIds.length > 0) {
      let q = supabaseAdmin
        .from('jobs')
        .select(PUBLIC_COLS, { count: 'exact' })
        .in('id', scoredIds)

      if (category !== 'all') q = q.eq('category', category)
      if (type === 'remote') q = q.eq('is_remote', true)
      if (search) {
        for (const term of search.trim().split(/\s+/).filter(Boolean)) {
          q = q.ilike('title', `%${term}%`)
        }
      }

      const { data: rows, count } = await q
      const sorted = (rows ?? [])
        .map(j => ({ ...j, fit_score: scoreMap.get(j.id) ?? null }))
        .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))

      return { jobs: sorted.slice(offset, offset + pageSize), total: count ?? 0 }
    }
  }

  let q = supabaseAdmin
    .from('jobs')
    .select(PUBLIC_COLS, { count: 'exact' })
    .order('posted_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (category !== 'all') q = q.eq('category', category)
  if (type === 'remote') q = q.eq('is_remote', true)
  if (search) {
    for (const term of search.trim().split(/\s+/).filter(Boolean)) {
      q = q.ilike('title', `%${term}%`)
    }
  }

  const { data, count } = await q
  return {
    jobs: (data ?? []).map(j => ({ ...j, fit_score: null })),
    total: count ?? 0,
  }
}

export async function getJobById(jobId: string): Promise<JobDetail | null> {
  const { data } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company, location, description, url, salary_min, salary_max, source, is_remote, posted_at')
    .eq('id', jobId)
    .maybeSingle()
  return data ?? null
}

export async function getUserIdFromRequest(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}
