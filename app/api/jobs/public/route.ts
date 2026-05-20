import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const COLS = 'id, title, company, location, salary_min, salary_max, source, is_remote, posted_at, category, language'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? 'all'
  const type = searchParams.get('type') ?? 'all'
  const page = parseInt(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const sort = searchParams.get('sort') ?? 'date'
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // For score-sorted requests from logged-in users: sort globally across all scored jobs
  if (user && sort === 'score') {
    const { data: allScores } = await supabaseAdmin
      .from('job_matches')
      .select('job_id, fit_score')
      .eq('user_id', user.id)

    const scoreMap = new Map((allScores ?? []).map(m => [m.job_id as string, m.fit_score as number]))
    const scoredJobIds = [...scoreMap.keys()]

    if (scoredJobIds.length > 0) {
      let q = supabaseAdmin
        .from('jobs')
        .select(COLS, { count: 'exact' })
        .in('id', scoredJobIds)

      if (category !== 'all') q = q.eq('category', category)
      if (type === 'remote') q = q.eq('is_remote', true)
      if (search) {
        for (const term of search.trim().split(/\s+/).filter(Boolean)) {
          q = q.ilike('title', `%${term}%`)
        }
      }

      const { data: scoredJobs, count } = await q

      const sorted = (scoredJobs ?? [])
        .map(j => ({ ...j, fit_score: scoreMap.get(j.id) ?? null }))
        .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))

      return NextResponse.json({
        jobs: sorted.slice(offset, offset + pageSize),
        total: count ?? 0,
        page,
        pageSize,
      })
    }
    // No scores yet — fall through to date sort
  }

  // Default: newest first
  let q = supabaseAdmin
    .from('jobs')
    .select(COLS, { count: 'exact' })
    .order('posted_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (category !== 'all') q = q.eq('category', category)
  if (type === 'remote') q = q.eq('is_remote', true)
  if (search) {
    for (const term of search.trim().split(/\s+/).filter(Boolean)) {
      q = q.ilike('title', `%${term}%`)
    }
  }

  const { data: jobs, count } = await q

  let scoreMap = new Map<string, number>()
  if (user && jobs?.length) {
    const jobIds = jobs.map(j => j.id)
    const { data: matches } = await supabaseAdmin
      .from('job_matches')
      .select('job_id, fit_score')
      .eq('user_id', user.id)
      .in('job_id', jobIds)
    scoreMap = new Map((matches ?? []).map(m => [m.job_id as string, m.fit_score as number]))
  }

  return NextResponse.json({
    jobs: (jobs ?? []).map(j => ({ ...j, fit_score: scoreMap.get(j.id) ?? null })),
    total: count ?? 0,
    page,
    pageSize,
  })
}
