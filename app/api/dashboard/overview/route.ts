import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  const [matchesRes, appsRes, coachRes] = await Promise.all([
    supabaseAdmin
      .from('job_matches')
      .select('id, fit_score, fit_explanation, user_viewed, batch_date, jobs(id, title, company, location, is_remote, source, url, salary_min, salary_max)')
      .eq('user_id', uid)
      .order('fit_score', { ascending: false })
      .limit(60),

    supabaseAdmin
      .from('applications')
      .select('status')
      .eq('user_id', uid),

    supabaseAdmin
      .from('profile_clarifications')
      .select('id')
      .eq('user_id', uid)
      .eq('dismissed', false)
      .is('answer', null),
  ])

  // Deduplicate matches by job_id (keep highest score)
  type MatchRow = NonNullable<typeof matchesRes.data>[number]
  const bestByJob = new Map<string, MatchRow>()
  for (const m of matchesRes.data ?? []) {
    const job = Array.isArray(m.jobs) ? m.jobs[0] : m.jobs
    if (!job) continue
    const key = (job as { id: string }).id
    const existing = bestByJob.get(key)
    if (!existing || m.fit_score > (existing.fit_score ?? 0)) bestByJob.set(key, m)
  }
  const allMatches = [...bestByJob.values()].sort((a, b) => b.fit_score - a.fit_score)

  const topMatches = allMatches.slice(0, 3).map(m => ({
    id: m.id,
    fit_score: m.fit_score,
    fit_explanation: m.fit_explanation,
    user_viewed: m.user_viewed,
    batch_date: m.batch_date,
    job: Array.isArray(m.jobs) ? m.jobs[0] : m.jobs,
  }))

  const lastScored = allMatches.reduce<string | null>((acc, m) => {
    if (!acc || m.batch_date > acc) return m.batch_date
    return acc
  }, null)

  // Application status counts
  const apps = appsRes.data ?? []
  const statusCounts: Record<string, number> = {}
  for (const a of apps) {
    if (a.status) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1
  }

  return NextResponse.json({
    top_matches: topMatches,
    total_matches: allMatches.length,
    new_matches: allMatches.filter(m => !m.user_viewed).length,
    last_scored: lastScored,
    application_counts: statusCounts,
    total_applications: apps.length,
    coach_pending: (coachRes.data ?? []).length,
  })
}
