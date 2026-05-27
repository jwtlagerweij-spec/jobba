import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureJobUnlocked } from '@/lib/credits'

function levelCoverLetterInstruction(level: string, careerDirection?: string | null): string {
  const base = careerDirection?.trim()
    ? `The candidate is making a career transition: ${careerDirection.trim()}. Acknowledge this transition naturally — explain why their transferable skills make them a strong fit for this specific role, without over-apologising for the change.`
    : ''

  if (level === 'student' || level === 'graduate') {
    return [
      base,
      'This is an early-career candidate. Lead with academic achievements, relevant coursework, internship experience, and eagerness to learn.',
      'Since work experience is limited, pivot to potential, motivation, and transferable skills from education and projects.',
      'Do NOT use phrases like "I have extensive experience" — be honest about being early-career while showing genuine enthusiasm.',
    ].filter(Boolean).join(' ')
  }
  if (level === 'junior') {
    return [
      base,
      'This is a junior professional with 0–2 years of experience.',
      'Highlight early career wins, practical skills applied in real projects, and growth trajectory.',
      'Reference specific measurable outcomes where possible.',
    ].filter(Boolean).join(' ')
  }
  if (level === 'medior') {
    return [
      base,
      'This is a mid-career professional with 3–5 years of experience.',
      'Lead with impact and ownership — specific projects, measurable results, and demonstrated progression.',
      'Balance technical skills with collaboration and initiative.',
    ].filter(Boolean).join(' ')
  }
  if (level === 'senior') {
    return [
      base,
      'This is a senior professional with 6–10 years of experience.',
      'Lead with strategic impact, cross-functional achievements, and domain expertise.',
      'Write in a confident, direct voice. Avoid "I want to learn" framing — show "I deliver results".',
      'Reference specific business outcomes, team impact, or key projects by name.',
    ].filter(Boolean).join(' ')
  }
  if (level === 'lead') {
    return [
      base,
      'This is a lead or principal-level professional with 10+ years of experience.',
      'Open with strategic leadership impact: team scale, business outcomes, and high-level direction.',
      'Emphasise people leadership, stakeholder management, and the ability to set and execute direction.',
      'Executive, direct tone — no junior framing whatsoever.',
    ].filter(Boolean).join(' ')
  }
  return base
}

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { job_id, tone = 'warm' } = await req.json()

  const [profileRes, prefsRes] = await Promise.all([
    supabaseAdmin.from('profiles')
      .select('resume_text, ai_credits_remaining')
      .eq('id', user.id).single(),
    supabaseAdmin.from('job_preferences')
      .select('job_level, experience_level, career_direction')
      .eq('user_id', user.id).single(),
  ])

  const profile = profileRes.data
  const prefs = prefsRes.data

  if (!profile?.resume_text) return Response.json({ error: 'No resume found.' }, { status: 400 })

  const unlock = await ensureJobUnlocked(user.id, job_id)
  if (!unlock.ok) return Response.json({ error: unlock.reason ?? 'No credits remaining.' }, { status: 402 })

  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('title, company, description, location, language')
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

  const toneInstruction = tone === 'formal'
    ? 'Write in a formal, professional tone.'
    : 'Write in a warm, genuine tone that still sounds professional.'

  const jobLang = job.language === 'en' ? 'English' : 'Dutch'
  const jobLevel = prefs?.job_level ?? prefs?.experience_level ?? 'graduate'
  const levelInstruction = levelCoverLetterInstruction(jobLevel, prefs?.career_direction)

  const prompt = `Write a cover letter for this job application.

Job: ${job.title} at ${job.company ?? 'the company'} — ${job.location ?? 'Netherlands'}
Job description:
${(job.description ?? '').slice(0, 2000)}

Candidate resume:
${profile.resume_text.slice(0, 3000)}
${clarificationContext ? `\nAdditional context from coaching Q&A:\n${clarificationContext}` : ''}

Instructions:
- Write in ${jobLang}
- ${toneInstruction}
${levelInstruction ? `- ${levelInstruction}` : ''}
- 3 to 4 paragraphs, around 300 words
- Reference specific details from both the job and the resume — make it feel personal, not generic
- Do NOT include date, address, subject line, or greeting header — start directly with the first paragraph
- End with a confident, forward-looking closing sentence`

  const { data: existing } = await supabaseAdmin
    .from('cover_letters')
    .select('version')
    .eq('user_id', user.id)
    .eq('job_id', job_id)
    .maybeSingle()

  const newVersion = (existing?.version ?? 0) + 1

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    onFinish: async ({ text }) => {
      await supabaseAdmin.from('cover_letters').upsert({
        user_id: user.id,
        job_id,
        content: text,
        tone,
        version: newVersion,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,job_id' })
    },
  })

  return result.toTextStreamResponse()
}
