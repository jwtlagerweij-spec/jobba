import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildPrefsContext, type ScoringPrefs } from '@/lib/pipeline'

function levelInstruction(level: string): string {
  if (level === 'student')   return 'The candidate is a current student. Score 1–3 for any role requiring 2+ years of experience.'
  if (level === 'graduate' || level === 'entry') return 'The candidate is a recent graduate. Score 1–3 for roles requiring 3+ years of experience.'
  if (level === 'junior')    return 'The candidate is junior (0–2 yrs). Score 1–3 for roles requiring 5+ years.'
  if (level === 'medior')    return 'The candidate has 3–5 years of experience. Score senior roles lower unless clearly matched.'
  if (level === 'senior')    return 'The candidate is a senior professional with 6–10 years of experience.'
  if (level === 'lead')      return 'The candidate is a lead/principal professional with 10+ years of experience.'
  return ''
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profileRes, prefsRes, coachRes] = await Promise.all([
    supabaseAdmin.from('profiles')
      .select('resume_text, resume_extracted_keywords')
      .eq('id', user.id).single(),
    supabaseAdmin.from('job_preferences')
      .select('job_level, experience_level, years_in_field, job_titles, sector_preferences, career_direction, dutch_proficiency, work_arrangement, company_size, salary_min, salary_max, management_level, example_companies')
      .eq('user_id', user.id).single(),
    supabaseAdmin.from('profile_clarifications')
      .select('question, answer')
      .eq('user_id', user.id)
      .not('answer', 'is', null),
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data

  if (!profile?.resume_text) {
    return NextResponse.json({ error: 'No resume found.' }, { status: 400 })
  }

  const coachAnswers = (coachRes.data ?? []) as { question: string; answer: string }[]
  const experienceLevel = prefs?.job_level ?? prefs?.experience_level ?? 'graduate'
  const levelNote = levelInstruction(experienceLevel)

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

  const prefsContext = buildPrefsContext(scoringPrefs)
  const coachContext = coachAnswers.length > 0
    ? coachAnswers.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
    : ''

  const { data: existingMatches } = await supabaseAdmin
    .from('job_matches')
    .select('job_id')
    .eq('user_id', user.id)

  if (!existingMatches || existingMatches.length === 0) {
    return NextResponse.json({ rescored: 0 })
  }

  const jobIds = [...new Set(existingMatches.map(m => m.job_id))]

  const { data: jobs } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company, description')
    .in('id', jobIds)

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ rescored: 0 })
  }

  const today = new Date().toISOString().split('T')[0]
  const BATCH_SIZE = 8
  let rescored = 0

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)

    const jobList = batch.map((j, idx) =>
      `Job ${idx + 1} (id: ${j.id}): ${j.title} at ${j.company ?? 'Unknown'}\n${(j.description ?? '').slice(0, 1500)}`
    ).join('\n\n---\n\n')

    const prompt = `You are scoring job vacancies for a candidate based on their resume and stated preferences. Score each job from 1 to 10 for fit.
${levelNote ? `\nImportant: ${levelNote}\n` : ''}
Resume:
${profile.resume_text.slice(0, 3000)}

Candidate background keywords:
${profile.resume_extracted_keywords ?? ''}
${prefsContext ? `\nCandidate stated preferences (use these to adjust scores — if a job conflicts with a stated preference, lower the score):\n${prefsContext}\n` : ''}${coachContext ? `\nAdditional context from AI coaching Q&A:\n${coachContext}\n` : ''}
Jobs to score:
${jobList}

Return ONLY a JSON array — no markdown, no explanation:
[{ "job_id": "<exact id>", "score": <integer 1-10>, "explanation": "<2 sentences tailored to this candidate>" }]`

    try {
      const { text } = await generateText({ model: anthropic('claude-sonnet-4-6'), prompt })
      const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      const scores: { job_id: string; score: number; explanation: string }[] = JSON.parse(cleaned)

      for (const s of scores) {
        if (s.score < 1 || s.score > 10) continue
        await supabaseAdmin
          .from('job_matches')
          .update({ fit_score: s.score, fit_explanation: s.explanation, batch_date: today })
          .eq('user_id', user.id)
          .eq('job_id', s.job_id)
        rescored++
      }
    } catch (err) {
      console.error('Rescore batch error:', err)
    }
  }

  await supabaseAdmin.from('pipeline_logs').insert({
    run_date: today, step: 'rescore', user_id: user.id,
    status: 'ok', message: `Rescored ${rescored} jobs`,
  })

  return NextResponse.json({ rescored })
}
