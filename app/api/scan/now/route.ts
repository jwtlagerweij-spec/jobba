import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { fetchAdzunaJobs, type FetchedJob } from '@/lib/fetchers/adzuna'
import { fetchNVBJobs } from '@/lib/fetchers/nvb'
import { fetchIntermediairJobs } from '@/lib/fetchers/intermediair'
import { fetchJobbirdJobs } from '@/lib/fetchers/jobbird'
import { buildPrefsContext, type ScoringPrefs } from '@/lib/pipeline'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user profile + preferences
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

  // Collect unique search terms
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

  const prefsContext = buildPrefsContext(scoringPrefs)
  const coachContext = coachAnswers.length > 0
    ? coachAnswers.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
    : ''

  const allJobs: FetchedJob[] = []
  for (const term of allTerms) {
    const [adzuna, nvb, intermediair, jobbird] = await Promise.all([
      fetchAdzunaJobs(term, location, jobType).catch(() => [] as FetchedJob[]),
      fetchNVBJobs(term).catch(() => []),
      fetchIntermediairJobs(term).catch(() => []),
      fetchJobbirdJobs(term).catch(() => []),
    ])
    allJobs.push(...adzuna, ...nvb, ...intermediair, ...jobbird)
    await new Promise(r => setTimeout(r, 300))
  }

  if (allJobs.length === 0) {
    await supabaseAdmin.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    return NextResponse.json({ matches_found: 0 })
  }

  // Deduplicate by external_id+source
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

  const BATCH_SIZE = 8
  const today = new Date().toISOString().split('T')[0]
  let totalMatches = 0

  // Pull all recent DB jobs so browse jobs get scores too
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

  const { data: todaysMatches } = await supabaseAdmin
    .from('job_matches')
    .select('job_id')
    .eq('user_id', user.id)
    .eq('batch_date', today)

  const alreadyScoredToday = new Set((todaysMatches ?? []).map(m => m.job_id))
  const jobsForScoring = allJobsPool.filter(j => !alreadyScoredToday.has(j.id)).slice(0, 24)

  const levelNote = experienceLevel === 'student'
    ? 'The candidate is a student looking for an internship or student job. Score 1–3 for any role requiring 2+ years of experience.'
    : experienceLevel === 'graduate' || experienceLevel === 'entry'
    ? 'The candidate is a recent graduate looking for their first job. Score 1–3 for any role requiring 3+ years of experience.'
    : experienceLevel === 'junior'
    ? 'The candidate is a junior professional with 0–2 years of experience. Score 1–3 for roles requiring 5+ years.'
    : experienceLevel === 'medior'
    ? 'The candidate has 3–5 years of experience. Score senior/lead roles lower unless clearly matched.'
    : experienceLevel === 'senior'
    ? 'The candidate is a senior professional with 6–10 years of experience.'
    : experienceLevel === 'lead'
    ? 'The candidate is a lead or principal-level professional with 10+ years of experience.'
    : ''

  for (let i = 0; i < jobsForScoring.length; i += BATCH_SIZE) {
    const batch = jobsForScoring.slice(i, i + BATCH_SIZE)

    const jobList = batch.map((j, idx) =>
      `Job ${idx + 1} (id: ${j.id}): ${j.title} at ${j.company ?? 'Unknown'}\n${(j.description ?? '').slice(0, 800)}`
    ).join('\n\n---\n\n')

    const scoringPrompt = `You are scoring job vacancies for a candidate based on their resume and stated preferences. Score each job from 1 to 10 for fit.
${levelNote ? `\nImportant: ${levelNote}\n` : ''}
Resume:
${profile.resume_text.slice(0, 3000)}

Candidate background keywords:
${profile.resume_extracted_keywords ?? ''}
${prefsContext ? `\nCandidate stated preferences (use these to adjust scores — if a job conflicts with a stated preference, lower the score):\n${prefsContext}\n` : ''}${coachContext ? `\nAdditional context from AI coaching Q&A:\n${coachContext}\n` : ''}
Jobs to score:
${jobList}

Return ONLY a JSON array with this exact structure — no markdown, no explanation:
[
  { "job_id": "<exact id from above>", "score": <integer 1-10>, "explanation": "<2 sentences: why this job fits or doesn't fit this specific candidate>" }
]`

    try {
      const { text } = await generateText({
        model: anthropic('claude-sonnet-4-6'),
        prompt: scoringPrompt,
      })

      const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      const scores: { job_id: string; score: number; explanation: string }[] = JSON.parse(cleaned)

      const matchRows = scores
        .filter(s => s.score >= 1 && s.score <= 10)
        .map(s => ({
          user_id: user.id,
          job_id: s.job_id,
          batch_date: today,
          fit_score: s.score,
          fit_explanation: s.explanation,
          email_sent: false,
          user_viewed: false,
        }))

      if (matchRows.length > 0) {
        await supabaseAdmin
          .from('job_matches')
          .upsert(matchRows, { onConflict: 'user_id,job_id,batch_date' })
        totalMatches += matchRows.length
      }

    } catch (err) {
      console.error(`Scoring batch ${i} error:`, err)
      await supabaseAdmin.from('pipeline_logs').insert({
        run_date: today,
        step: 'scan_now',
        user_id: user.id,
        status: 'error',
        message: String(err),
      })
    }
  }

  await supabaseAdmin
    .from('profiles')
    .update({ onboarding_done: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  await supabaseAdmin.from('pipeline_logs').insert({
    run_date: today,
    step: 'scan_now',
    user_id: user.id,
    status: 'ok',
    message: `Found ${totalMatches} matches`,
  })

  return NextResponse.json({ matches_found: totalMatches })
}

async function generateCoachQuestions(
  userId: string,
  borderlineJobs: { job_id: string; score: number; explanation: string }[],
  jobDetails: { id: string; title: string; company: string | null; description: string | null }[],
  resumeText: string
) {
  const jobMap = new Map(jobDetails.map(j => [j.id, j]))
  const today = new Date().toISOString().split('T')[0]

  const jobDescriptions = borderlineJobs
    .map(b => {
      const job = jobMap.get(b.job_id)
      if (!job) return null
      return `Job: ${job.title} at ${job.company ?? 'Unknown'}\nScore: ${b.score}/10\nWhy borderline: ${b.explanation}\nDescription excerpt: ${(job.description ?? '').slice(0, 400)}`
    })
    .filter(Boolean)
    .join('\n\n---\n\n')

  const prompt = `You scored these jobs between 4 and 8 for this candidate. Ask 1-2 targeted follow-up questions that would help clarify their fit.

Resume (excerpt):
${resumeText.slice(0, 2000)}

Borderline jobs:
${jobDescriptions}

Rules:
- Always write in English
- Reference the candidate's actual employers or projects by name if visible in the resume
- Sound like a smart friend asking, not a form
- Be specific: name the actual skill, tool, or project type
- Never ask yes/no questions — open-ended only
- Max 2 questions total across all jobs

Return ONLY a JSON array, no markdown:
[{ "question": "...", "context_ref": "brief topic label", "job_id": "<job id from above>" }]`

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt,
    })

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const questions: { question: string; context_ref: string; job_id: string }[] = JSON.parse(cleaned)

    for (const q of questions.slice(0, 2)) {
      const hash = await sha256(q.question)
      await supabaseAdmin
        .from('profile_clarifications')
        .upsert({
          user_id: userId,
          question: q.question,
          question_hash: hash,
          context_type: 'job',
          context_ref: q.job_id,
          dismissed: false,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,question_hash', ignoreDuplicates: true })
    }
  } catch (err) {
    console.error('Coach question generation error:', err)
    void today
  }
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
