import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAdzunaJobs, type FetchedJob } from '@/lib/fetchers/adzuna'
import { scoreJobsForUser, type ScoringPrefs } from '@/lib/pipeline'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profileRes, prefsRes, coachRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('resume_text, ai_generated_titles, resume_extracted_keywords')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('job_preferences')
      .select('job_titles, location, job_type, job_types, experience_level, job_level, years_in_field, sector_preferences, career_direction, dutch_proficiency, work_arrangement, company_size, salary_min, salary_max, management_level, example_companies')
      .eq('user_id', user.id)
      .single(),
    supabaseAdmin
      .from('profile_clarifications')
      .select('question, answer')
      .eq('user_id', user.id)
      .not('answer', 'is', null),
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data

  if (!profile?.resume_text) {
    return NextResponse.json({ error: 'No resume found. Please upload your resume first.' }, { status: 400 })
  }

  const coachAnswers = (coachRes.data ?? []) as { question: string; answer: string }[]

  const aiTitles: string[] = profile.ai_generated_titles ?? []
  const prefTitles: string[] = prefs?.job_titles ?? []
  const allTerms = [...new Set([...aiTitles, ...prefTitles])].slice(0, 3)

  if (allTerms.length === 0) {
    return NextResponse.json({ matches_found: 0 })
  }

  const location = prefs?.location ?? undefined
  const jobType = (prefs?.job_types?.[0] ?? prefs?.job_type) ?? 'job'
  const experienceLevel = prefs?.job_level ?? prefs?.experience_level ?? 'graduate'

  const scoringPrefs: ScoringPrefs = {
    job_titles: prefs?.job_titles ?? [],
    sector_preferences: prefs?.sector_preferences ?? [],
    career_direction: prefs?.career_direction ?? null,
    dutch_proficiency: prefs?.dutch_proficiency ?? null,
    work_arrangement: prefs?.work_arrangement ?? [],
    company_size: prefs?.company_size ?? [],
    salary_min: prefs?.salary_min ?? null,
    salary_max: prefs?.salary_max ?? null,
    management_level: prefs?.management_level ?? null,
    example_companies: prefs?.example_companies ?? [],
  }

  const allJobs: FetchedJob[] = []
  for (const term of allTerms) {
    const jobs = await fetchAdzunaJobs(term, location, jobType).catch(() => [] as FetchedJob[])
    allJobs.push(...jobs)
  }

  if (allJobs.length === 0) {
    await supabaseAdmin.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    return NextResponse.json({ matches_found: 0 })
  }

  const seen = new Set<string>()
  const uniqueJobs = allJobs.filter(j => {
    const key = `${j.external_id}:${j.source}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const { data: savedJobs } = await supabaseAdmin
    .from('jobs')
    .upsert(
      uniqueJobs.map(j => ({
        external_id: j.external_id,
        source: j.source,
        title: j.title,
        company: j.company,
        location: j.location,
        description: j.description,
        url: j.url,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        posted_at: j.posted_at,
        category: j.category,
        is_remote: j.is_remote,
        language: j.language,
      })),
      { onConflict: 'external_id,source', ignoreDuplicates: false }
    )
    .select('id, title, company, description')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 45)
  const { data: allRecentJobs } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company, description')
    .gte('posted_at', cutoff.toISOString())
    .limit(300)

  const freshIds = new Set((savedJobs ?? []).map(j => j.id))
  const extraJobs = (allRecentJobs ?? []).filter(j => !freshIds.has(j.id))
  const allJobsPool = [...(savedJobs ?? []), ...extraJobs]

  if (allJobsPool.length === 0) {
    await supabaseAdmin.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    return NextResponse.json({ matches_found: 0 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: todaysMatches } = await supabaseAdmin
    .from('job_matches')
    .select('job_id')
    .eq('user_id', user.id)
    .eq('batch_date', today)

  const alreadyScoredToday = new Set((todaysMatches ?? []).map(m => m.job_id))
  const jobsForScoring = allJobsPool.filter(j => !alreadyScoredToday.has(j.id)).slice(0, 24)

  const matches = await scoreJobsForUser(
    user.id,
    profile.resume_text,
    profile.resume_extracted_keywords ?? '',
    jobsForScoring,
    today,
    experienceLevel,
    scoringPrefs,
    coachAnswers
  )

  await supabaseAdmin
    .from('profiles')
    .update({ onboarding_done: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  await supabaseAdmin.from('pipeline_logs').insert({
    run_date: today,
    step: 'scan_now',
    user_id: user.id,
    status: 'ok',
    message: `Found ${matches.length} matches`,
  })

  return NextResponse.json({ matches_found: matches.length })
}
