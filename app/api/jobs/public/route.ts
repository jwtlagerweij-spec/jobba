import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? 'all'
  const type = searchParams.get('type') ?? 'all'
  const page = parseInt(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const pageSize = 20
  const offset = (page - 1) * pageSize

  let query = supabaseAdmin
    .from('jobs')
    .select('id, title, company, location, salary_min, salary_max, source, is_remote, posted_at, category, language', { count: 'exact' })
    .order('posted_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (category !== 'all') query = query.eq('category', category)
  if (type === 'remote') query = query.eq('is_remote', true)
  if (search) {
    // Split on whitespace and require every term to appear in title (AND logic)
    // so "interim school" finds "interim director of secondary school"
    const terms = search.trim().split(/\s+/).filter(Boolean)
    for (const term of terms) {
      query = query.ilike('title', `%${term}%`)
    }
  }

  const { data: jobs, count } = await query

  // If authenticated, attach personal fit scores
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let scoreMap = new Map<string, number>()
  if (user && jobs?.length) {
    const jobIds = jobs.map(j => j.id)
    const { data: matches } = await supabaseAdmin
      .from('job_matches')
      .select('job_id, fit_score')
      .eq('user_id', user.id)
      .in('job_id', jobIds)

    scoreMap = new Map((matches ?? []).map(m => [m.job_id, m.fit_score]))
  }

  const sort = searchParams.get('sort') ?? 'date'

  const result = (jobs ?? []).map(job => ({
    ...job,
    fit_score: scoreMap.get(job.id) ?? null,
  }))

  // For logged-in users requesting score sort: re-sort by fit_score desc (nulls last)
  if (user && sort === 'score') {
    result.sort((a, b) => {
      if (a.fit_score === null && b.fit_score === null) return 0
      if (a.fit_score === null) return 1
      if (b.fit_score === null) return -1
      return b.fit_score - a.fit_score
    })
  }

  return NextResponse.json({ jobs: result, total: count ?? 0, page, pageSize })
}
