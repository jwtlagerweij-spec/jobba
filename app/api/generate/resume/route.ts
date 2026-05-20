import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureJobUnlocked } from '@/lib/credits'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { job_id } = await req.json()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('resume_text, ai_credits_remaining')
    .eq('id', user.id)
    .single()

  if (!profile?.resume_text) return Response.json({ error: 'No resume found.' }, { status: 400 })

  const unlock = await ensureJobUnlocked(user.id, job_id)
  if (!unlock.ok) return Response.json({ error: unlock.reason ?? 'No credits remaining.' }, { status: 402 })

  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('title, company, description')
    .eq('id', job_id)
    .single()

  if (!job) return Response.json({ error: 'Job not found.' }, { status: 404 })

  const { data: existing } = await supabaseAdmin
    .from('tailored_resumes')
    .select('version')
    .eq('user_id', user.id)
    .eq('job_id', job_id)
    .maybeSingle()

  const newVersion = (existing?.version ?? 0) + 1

  const prompt = `You are tailoring a resume to better match a specific job description.

Job: ${job.title} at ${job.company ?? 'the company'}
Job description:
${(job.description ?? '').slice(0, 2000)}

Original resume:
${profile.resume_text.slice(0, 3000)}

Instructions:
- Rewrite the resume to better highlight experience and skills relevant to this job
- Keep all factual content accurate — do not invent experience or skills
- Reorder or reword bullet points to emphasise relevance to the job
- Use keywords from the job description naturally
- Return ONLY the full tailored resume text — no explanation, no commentary`

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    onFinish: async ({ text }) => {
      await supabaseAdmin.from('tailored_resumes').upsert({
        user_id: user.id,
        job_id,
        original_text: profile.resume_text,
        tailored_text: text,
        version: newVersion,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,job_id' })
    },
  })

  return result.toTextStreamResponse()
}
