import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { fetchAdzunaJobs, type FetchedJob } from '@/lib/fetchers/adzuna'

export interface ScoredMatch {
  job_id: string
  fit_score: number
  fit_explanation: string
}

export async function fetchAndUpsertJobs(terms: string[], location?: string): Promise<{ id: string; title: string; company: string | null; description: string | null }[]> {
  const allJobs: FetchedJob[] = []
  for (const term of terms) {
    const jobs = await fetchAdzunaJobs(term, location).catch(() => [] as FetchedJob[])
    allJobs.push(...jobs)
    await new Promise(r => setTimeout(r, 300))
  }

  if (allJobs.length === 0) return []

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

  return savedJobs ?? []
}

export async function scoreJobsForUser(
  userId: string,
  resumeText: string,
  keywords: string,
  jobs: { id: string; title: string; company: string | null; description: string | null }[],
  today: string
): Promise<ScoredMatch[]> {
  const BATCH_SIZE = 8
  const allMatches: ScoredMatch[] = []

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)

    const jobList = batch.map((j, idx) =>
      `Job ${idx + 1} (id: ${j.id}): ${j.title} at ${j.company ?? 'Unknown'}\n${(j.description ?? '').slice(0, 500)}`
    ).join('\n\n---\n\n')

    const prompt = `You are scoring job vacancies for a candidate based on their resume. Score each job from 1 to 10 for fit.

Resume:
${resumeText.slice(0, 3000)}

Additional candidate context:
${keywords}

Jobs to score:
${jobList}

Return ONLY a JSON array with this exact structure — no markdown, no explanation:
[
  { "job_id": "<exact id from above>", "score": <integer 1-10>, "explanation": "<2 sentences: why this job fits or doesn't fit this specific candidate>" }
]`

    try {
      const { text } = await generateText({ model: anthropic('claude-sonnet-4-6'), prompt })
      const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      const scores: { job_id: string; score: number; explanation: string }[] = JSON.parse(cleaned)

      const matchRows = scores
        .filter(s => s.score >= 1 && s.score <= 10)
        .map(s => ({
          user_id: userId,
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
        allMatches.push(...matchRows.map(m => ({ job_id: m.job_id, fit_score: m.fit_score, fit_explanation: m.fit_explanation })))
      }

      // Coach questions for borderline jobs
      const borderline = scores.filter(s => s.score >= 4 && s.score <= 8).slice(0, 3)
      if (borderline.length > 0) {
        await generateCoachQuestions(userId, borderline, batch, resumeText)
      }
    } catch (err) {
      console.error(`Scoring batch error for user ${userId}:`, err)
      await supabaseAdmin.from('pipeline_logs').insert({
        run_date: today, step: 'score', user_id: userId, status: 'error', message: String(err),
      })
    }
  }

  return allMatches
}

async function generateCoachQuestions(
  userId: string,
  borderlineJobs: { job_id: string; score: number; explanation: string }[],
  jobDetails: { id: string; title: string; company: string | null; description: string | null }[],
  resumeText: string
) {
  const jobMap = new Map(jobDetails.map(j => [j.id, j]))

  const jobDescriptions = borderlineJobs
    .map(b => {
      const job = jobMap.get(b.job_id)
      if (!job) return null
      return `Job: ${job.title} at ${job.company ?? 'Unknown'}\nScore: ${b.score}/10\nWhy borderline: ${b.explanation}\nDescription: ${(job.description ?? '').slice(0, 400)}`
    })
    .filter(Boolean).join('\n\n---\n\n')

  const prompt = `You scored these jobs between 4 and 8 for this candidate. Ask 1-2 targeted follow-up questions that would help clarify their fit.

Resume (excerpt):
${resumeText.slice(0, 2000)}

Borderline jobs:
${jobDescriptions}

Rules:
- Reference the candidate's actual employers or projects by name if visible
- Sound like a smart friend asking, not a form
- Be specific: name the actual skill, tool, or project type
- Never ask yes/no questions — open-ended only
- Max 2 questions total

Return ONLY a JSON array, no markdown:
[{ "question": "...", "context_ref": "brief topic label", "job_id": "<job id>" }]`

  try {
    const { text } = await generateText({ model: anthropic('claude-sonnet-4-6'), prompt })
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const questions: { question: string; context_ref: string; job_id: string }[] = JSON.parse(cleaned)

    for (const q of questions.slice(0, 2)) {
      const hash = await sha256(q.question)
      await supabaseAdmin
        .from('profile_clarifications')
        .upsert({
          user_id: userId, question: q.question, question_hash: hash,
          context_type: 'job', context_ref: q.job_id, dismissed: false,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,question_hash', ignoreDuplicates: true })
    }
  } catch (err) {
    console.error('Coach question error:', err)
  }
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}
