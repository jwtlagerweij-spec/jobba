import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureJobUnlocked } from '@/lib/credits'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { job_id, existing_letter } = await req.json()
  if (!existing_letter?.trim()) {
    return Response.json({ error: 'Paste your existing cover letter first.' }, { status: 400 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('resume_text, ai_credits_remaining')
    .eq('id', user.id)
    .single()

  const unlock = await ensureJobUnlocked(user.id, job_id)
  if (!unlock.ok) return Response.json({ error: unlock.reason ?? 'No credits remaining.' }, { status: 402 })

  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('title, company, description, location, language')
    .eq('id', job_id)
    .single()

  if (!job) return Response.json({ error: 'Job not found.' }, { status: 404 })

  const jobLang = job.language === 'en' ? 'English' : 'Dutch'

  const prompt = `You are helping a job applicant tailor their existing cover letter to a specific job posting.

Existing cover letter (written by the applicant — preserve their voice, style, and structure as much as possible):
${existing_letter}

Job to tailor for:
${job.title} at ${job.company ?? 'the company'} — ${job.location ?? 'Netherlands'}

Job description:
${(job.description ?? '').slice(0, 2000)}

${profile?.resume_text ? `Candidate resume (for additional context):\n${profile.resume_text.slice(0, 1500)}` : ''}

Instructions:
- Keep the applicant's original voice, tone, and writing style — do NOT rewrite from scratch
- Replace company-specific references (names, role titles) with those from the new job
- Highlight skills and experiences from the existing letter that are most relevant to this specific job
- Add or adjust 1-2 sentences if needed to address key requirements in the job description
- Write in ${jobLang}
- Return only the tailored cover letter text, nothing else`

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
        tone: 'tailored',
        version: newVersion,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,job_id' })
    },
  })

  return result.toTextStreamResponse()
}
