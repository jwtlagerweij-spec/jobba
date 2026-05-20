import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureJobUnlocked } from '@/lib/credits'

function levelInterviewInstruction(level: string): string {
  if (level === 'student' || level === 'graduate') {
    return `You are a career coach preparing an early-career candidate (student or recent graduate) for a job interview.
Focus on: motivation questions, academic background and projects, learning agility, and how they handle feedback.
Include one question about handling a professional challenge for the first time.
Suggested answers should reference education, internships, and transferable skills — do not assume extensive work history.`
  }
  if (level === 'junior') {
    return `You are a career coach preparing a junior professional (0–2 years experience) for a job interview.
Focus on: motivation, specific early-career projects, handling mistakes and growth, and technical fundamentals.
Include at least one behavioral (STAR-format) question about owning a task end-to-end.
Suggested answers should reference real projects and show self-awareness about areas for growth.`
  }
  if (level === 'medior') {
    return `You are a career coach preparing a mid-career professional (3–5 years experience) for a job interview.
Focus on: impact and ownership, cross-functional collaboration, decision-making, and career progression.
Include at least one question about influencing without authority and one about a complex project.
Suggested answers should highlight measurable outcomes and demonstrate proactive ownership.`
  }
  if (level === 'senior') {
    return `You are a career coach preparing a senior professional (6–10 years experience) for a job interview.
Focus on: strategic impact, leading teams or projects, stakeholder management, and domain expertise.
Include questions about setting direction, handling ambiguity, and driving organisational change.
Suggested answers should be results-oriented, reference named projects or employers, and avoid junior framing.`
  }
  if (level === 'lead') {
    return `You are a career coach preparing a lead or principal-level professional (10+ years experience) for a job interview.
Focus on: leadership philosophy, building and scaling teams, executive stakeholder management, and P&L or strategic accountability.
Include questions about managing up, setting long-term vision, and handling conflict at a leadership level.
Suggested answers should reflect executive maturity — strategic, direct, and outcomes-focused.`
  }
  return `You are a career coach preparing a candidate for a job interview.`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { job_id } = await req.json()

  const [profileRes, prefsRes] = await Promise.all([
    supabaseAdmin.from('profiles')
      .select('resume_text, ai_credits_remaining')
      .eq('id', user.id).single(),
    supabaseAdmin.from('job_preferences')
      .select('job_level, experience_level')
      .eq('user_id', user.id).single(),
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data

  if (!profile?.resume_text) return Response.json({ error: 'No resume found.' }, { status: 400 })

  const unlock = await ensureJobUnlocked(user.id, job_id)
  if (!unlock.ok) return Response.json({ error: unlock.reason ?? 'No credits remaining.' }, { status: 402 })

  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('title, company, description, location')
    .eq('id', job_id)
    .single()

  if (!job) return Response.json({ error: 'Job not found.' }, { status: 404 })

  const { data: clarifications } = await supabaseAdmin
    .from('profile_clarifications')
    .select('question, answer')
    .eq('user_id', user.id)
    .not('answer', 'is', null)

  const clarificationContext = (clarifications ?? [])
    .map(c => `Q: ${c.question}\nA: ${c.answer}`)
    .join('\n\n')

  const jobLevel = prefs?.job_level ?? prefs?.experience_level ?? 'graduate'
  const coachInstruction = levelInterviewInstruction(jobLevel)

  const prompt = `${coachInstruction} Generate 6 interview questions they are likely to be asked, with a tailored suggested answer for each based on their specific resume.

Job: ${job.title} at ${job.company ?? 'the company'} — ${job.location ?? 'Netherlands'}
Job description:
${(job.description ?? '').slice(0, 2000)}

Candidate resume:
${profile.resume_text.slice(0, 3000)}
${clarificationContext ? `\nAdditional context from coaching Q&A:\n${clarificationContext}` : ''}

Format your response exactly like this for each question (use --- to separate questions):

**Question 1: [question text]**
*Why they ask this:* [1 sentence on what the interviewer is really looking for]
*Your answer:* [2-4 sentences tailored to this candidate's specific experience — reference their actual projects, employers, or skills by name]

---

**Question 2: ...**
...

Rules:
- Always respond in English, regardless of the language of the job description
- Mix of: motivation questions, behavioural (STAR), technical/role-specific, and "do you have questions for us"
- Always reference the candidate's actual experience — never give generic answers
- Keep answers confident and natural, not robotic
- Last question should always be a strong question the candidate can ask the interviewer`

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    onFinish: async () => {},
  })

  return result.toTextStreamResponse()
}
