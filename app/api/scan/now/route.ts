import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { scoreJobsForUser, type ScoringPrefs } from '@/lib/pipeline'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profileRes, prefsRes, coachRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('resume_text, resume_extracted_keywords')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('job_preferences')
      .select('job_titles, job_type, job_types, experience_level, job_level, sector_preferences, career_direction, dutch_proficiency, work_arrangement, company_size, salary_min, salary_max, management_level, example_companies')
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

  const today = new Date().toISOString().split('T')[0]
  const coachAnswers = (coachRes.data ?? []) as { question: string; answer: string }[]
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

  // Pull from the shared jobs pool — no Adzuna call, no external dependency.
  // The 5am crawl cron keeps this pool fresh and diverse.
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 45)

  const [jobsRes, todaysMatchesRes] = await Promise.all([
    supabaseAdmin
      .from('jobs')
      .select('id, title, company, description')
      .gte('posted_at', cutoff.toISOString())
      .order('posted_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('job_matches')
      .select('job_id')
      .eq('user_id', user.id)
      .eq('batch_date', today),
  ])

  const allJobs = jobsRes.data ?? []
  const alreadyScoredToday = new Set((todaysMatchesRes.data ?? []).map(m => m.job_id))
  const jobsToScore = allJobs.filter(j => !alreadyScoredToday.has(j.id)).slice(0, 40)

  if (jobsToScore.length === 0) {
    await supabaseAdmin.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    return NextResponse.json({ matches_found: 0 })
  }

  const matches = await scoreJobsForUser(
    user.id,
    profile.resume_text,
    profile.resume_extracted_keywords ?? '',
    jobsToScore,
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
    message: `Scored ${jobsToScore.length} jobs, found ${matches.length} matches`,
  })

  return NextResponse.json({ matches_found: matches.length })
}
