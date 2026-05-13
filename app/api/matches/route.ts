import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface JobRow {
  id: string; title: string; company: string; location: string; url: string
  salary_min: number; salary_max: number; source: string; is_remote: boolean; posted_at: string
}

interface MatchRow {
  id: string; fit_score: number; fit_explanation: string
  user_viewed: boolean; batch_date: string; jobs: JobRow | JobRow[] | null
}

function firstJob(jobs: JobRow | JobRow[] | null): JobRow | null {
  if (!jobs) return null
  return Array.isArray(jobs) ? (jobs[0] ?? null) : jobs
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const { data: matches } = await supabase
    .from('job_matches')
    .select(`
      id, fit_score, fit_explanation, user_viewed, batch_date,
      jobs ( id, title, company, location, url, salary_min, salary_max, source, is_remote, posted_at )
    `)
    .eq('user_id', user.id)
    .eq('batch_date', date)
    .order('fit_score', { ascending: false })

  const typedMatches = (matches ?? []) as unknown as MatchRow[]
  const jobIds = typedMatches.map(m => firstJob(m.jobs)?.id).filter(Boolean) as string[]

  const { data: applications } = jobIds.length > 0
    ? await supabase.from('applications').select('job_id, status').eq('user_id', user.id).in('job_id', jobIds)
    : { data: [] }

  const statusMap = new Map((applications ?? []).map((a: { job_id: string; status: string }) => [a.job_id, a.status]))

  const result = typedMatches.map(m => ({
    ...m,
    jobs: firstJob(m.jobs),
    application_status: statusMap.get(firstJob(m.jobs)?.id ?? '') ?? null,
  }))

  return NextResponse.json({ matches: result, date })
}
