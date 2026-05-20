import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { fetchAdzunaJobs, type FetchedJob } from '@/lib/fetchers/adzuna'
import { fetchNVBJobs } from '@/lib/fetchers/nvb'
import { fetchIntermediairJobs } from '@/lib/fetchers/intermediair'
import { fetchJobbirdJobs } from '@/lib/fetchers/jobbird'

export interface ScoredMatch {
  job_id: string
  fit_score: number
  fit_explanation: string
}

export interface ScoringPrefs {
  job_titles?: string[]
  sector_preferences?: string[]
  career_direction?: string | null
  dutch_proficiency?: string | null
  work_arrangement?: string[]
  company_size?: string[]
  salary_min?: number | null
  salary_max?: number | null
  management_level?: string | null
  example_companies?: string[]
}

export async function fetchAndUpsertJobs(terms: string[], location?: string, jobType = 'job'): Promise<{ id: string; title: string; company: string | null; description: string | null }[]> {
  const allJobs: FetchedJob[] = []
  for (const term of terms) {
    const [adzunaJobs, nvbJobs, intermediairJobs, jobbirdJobs] = await Promise.all([
      fetchAdzunaJobs(term, location, jobType).catch(() => [] as FetchedJob[]),
      fetchNVBJobs(term).catch(() => []),
      fetchIntermediairJobs(term).catch(() => []),
      fetchJobbirdJobs(term).catch(() => []),
    ])
    allJobs.push(...adzunaJobs, ...nvbJobs, ...intermediairJobs, ...jobbirdJobs)
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

function experienceLevelInstruction(level: string): string {
  if (level === 'student') return 'The candidate is a current student looking for an internship or student job. Score 1–3 for any role requiring 2+ years of experience.'
  if (level === 'graduate' || level === 'entry') return 'The candidate is a recent graduate looking for their first job. Score 1–3 for any role requiring 3+ years of experience.'
  if (level === 'junior') return 'The candidate is a junior professional with 0–2 years of experience. Score 1–3 for roles requiring 5+ years.'
  if (level === 'medior') return 'The candidate has 3–5 years of experience. Score senior/lead roles lower unless requirements are a clear match.'
  if (level === 'senior') return 'The candidate is a senior professional with 6–10 years of experience.'
  if (level === 'lead') return 'The candidate is a lead or principal-level professional with 10+ years of experience.'
  return ''
}

export function buildPrefsContext(prefs: ScoringPrefs): string {
  const lines: string[] = []

  if (prefs.job_titles?.length) {
    lines.push(`- Target job titles: ${prefs.job_titles.join(', ')}`)
  }
  if (prefs.sector_preferences?.length) {
    lines.push(`- Preferred sectors: ${prefs.sector_preferences.join(', ')}`)
  }
  if (prefs.career_direction?.trim()) {
    lines.push(`- Career direction / transition: ${prefs.career_direction.trim()}`)
  }
  if (prefs.management_level) {
    const mgmtLabels: Record<string, string> = {
      ic: 'individual contributor (no direct reports)',
      lead: 'team or tech lead',
      manager: 'manager / head of department',
      director: 'director or VP',
      executive: 'C-level or board',
    }
    lines.push(`- Desired role type: ${mgmtLabels[prefs.management_level] ?? prefs.management_level}`)
  }
  if (prefs.dutch_proficiency) {
    const profLabels: Record<string, string> = {
      native: 'native Dutch speaker',
      fluent: 'fluent Dutch (C1/C2)',
      basic: 'basic Dutch (A1–B1)',
      none: 'does not speak Dutch — can only apply to English-language roles',
    }
    lines.push(`- Dutch proficiency: ${profLabels[prefs.dutch_proficiency] ?? prefs.dutch_proficiency}`)
  }
  if (prefs.work_arrangement?.length) {
    lines.push(`- Work arrangement preference: ${prefs.work_arrangement.join(' / ')}`)
  }
  if (prefs.company_size?.length) {
    const sizeLabels: Record<string, string> = {
      startup: 'startup (<50 people)',
      scaleup: 'scale-up (50–500 people)',
      sme: 'SME / midsize',
      corporate: 'large corporate (1000+)',
      multinational: 'multinational / global enterprise',
    }
    const sizes = prefs.company_size.map(s => sizeLabels[s] ?? s)
    lines.push(`- Company size preference: ${sizes.join(', ')}`)
  }
  if (prefs.salary_min || prefs.salary_max) {
    const min = prefs.salary_min ? `€${prefs.salary_min.toLocaleString()}` : 'open'
    const max = prefs.salary_max ? `€${prefs.salary_max.toLocaleString()}` : 'open'
    lines.push(`- Salary expectations: ${min} – ${max} annual gross`)
  }
  if (prefs.example_companies?.length) {
    lines.push(`- Admired companies / cultural reference points: ${prefs.example_companies.join(', ')}`)
  }

  return lines.join('\n')
}

export async function scoreJobsForUser(
  userId: string,
  resumeText: string,
  keywords: string,
  jobs: { id: string; title: string; company: string | null; description: string | null }[],
  today: string,
  experienceLevel = 'entry',
  prefs: ScoringPrefs = {},
  coachAnswers: { question: string; answer: string }[] = []
): Promise<ScoredMatch[]> {
  const BATCH_SIZE = 8
  const allMatches: ScoredMatch[] = []

  const prefsContext = buildPrefsContext(prefs)
  const coachContext = coachAnswers.length > 0
    ? coachAnswers.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')
    : ''

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)

    const jobList = batch.map((j, idx) =>
      `Job ${idx + 1} (id: ${j.id}): ${j.title} at ${j.company ?? 'Unknown'}\n${(j.description ?? '').slice(0, 1500)}`
    ).join('\n\n---\n\n')

    const levelNote = experienceLevelInstruction(experienceLevel)

    const prompt = `You are scoring job vacancies for a candidate based on their resume and stated preferences. Score each job from 1 to 10 for fit.

${levelNote ? `Important: ${levelNote}\n` : ''}
Resume:
${resumeText.slice(0, 3000)}

Candidate background keywords:
${keywords}
${prefsContext ? `\nCandidate stated preferences (use these to adjust scores — if a job conflicts with a stated preference, lower the score):\n${prefsContext}\n` : ''}${coachContext ? `\nAdditional context from AI coaching Q&A:\n${coachContext}\n` : ''}
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
- Always write in English
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
