import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { fetchAdzunaJobs, type FetchedJob } from '@/lib/fetchers/adzuna'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user profile + preferences
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('resume_text, ai_generated_titles, resume_extracted_keywords')
    .eq('id', user.id)
    .single()

  if (!profile?.resume_text) {
    return NextResponse.json({ error: 'No resume found. Please upload your resume first.' }, { status: 400 })
  }

  const { data: prefs } = await supabaseAdmin
    .from('job_preferences')
    .select('job_titles, location')
    .eq('user_id', user.id)
    .single()

  // Collect unique search terms
  const aiTitles: string[] = profile.ai_generated_titles ?? []
  const prefTitles: string[] = prefs?.job_titles ?? []
  const allTerms = [...new Set([...aiTitles, ...prefTitles])].slice(0, 6)

  if (allTerms.length === 0) {
    return NextResponse.json({ matches_found: 0 })
  }

  // Fetch jobs from Adzuna sequentially to avoid rate limiting
  const location = prefs?.location ?? undefined
  const allJobs: FetchedJob[] = []
  for (const term of allTerms) {
    const jobs = await fetchAdzunaJobs(term, location).catch(() => [] as FetchedJob[])
    allJobs.push(...jobs)
    // Small pause between requests to stay within rate limits
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

  // Upsert jobs into shared jobs table
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

  if (!savedJobs || savedJobs.length === 0) {
    await supabaseAdmin.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    return NextResponse.json({ matches_found: 0 })
  }

  // Score jobs in batches of 8
  const BATCH_SIZE = 8
  const today = new Date().toISOString().split('T')[0]
  let totalMatches = 0

  const jobsForScoring = savedJobs.slice(0, 40) // cap at 40 for first scan

  for (let i = 0; i < jobsForScoring.length; i += BATCH_SIZE) {
    const batch = jobsForScoring.slice(i, i + BATCH_SIZE)

    const jobList = batch.map((j, idx) =>
      `Job ${idx + 1} (id: ${j.id}): ${j.title} at ${j.company ?? 'Unknown'}\n${(j.description ?? '').slice(0, 500)}`
    ).join('\n\n---\n\n')

    const scoringPrompt = `You are scoring job vacancies for a candidate based on their resume. Score each job from 1 to 10 for fit.

Resume:
${profile.resume_text.slice(0, 3000)}

Additional candidate context:
${profile.resume_extracted_keywords ?? ''}

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

      // Generate coach questions for borderline jobs (score 4-8)
      const borderline = scores.filter(s => s.score >= 4 && s.score <= 8).slice(0, 3)
      if (borderline.length > 0) {
        await generateCoachQuestions(user.id, borderline, batch, profile.resume_text)
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

  // Mark onboarding complete
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
  }
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
