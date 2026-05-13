import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { job_id, tone = 'warm' } = await req.json()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('resume_text, ai_credits_remaining')
    .eq('id', user.id)
    .single()

  if (!profile?.resume_text) return Response.json({ error: 'No resume found.' }, { status: 400 })
  if ((profile.ai_credits_remaining ?? 0) <= 0) {
    return Response.json({ error: 'No credits remaining.' }, { status: 402 })
  }

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

  const prompt = `Write a cover letter for this job application.

Job: ${job.title} at ${job.company ?? 'the company'} — ${job.location ?? 'Netherlands'}
Job description:
${(job.description ?? '').slice(0, 2000)}

Candidate resume:
${profile.resume_text.slice(0, 3000)}
${clarificationContext ? `\nAdditional context:\n${clarificationContext}` : ''}

Instructions:
- Write in ${jobLang}
- ${toneInstruction}
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
      await Promise.all([
        supabaseAdmin.from('cover_letters').upsert({
          user_id: user.id,
          job_id,
          content: text,
          tone,
          version: newVersion,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,job_id' }),
        supabaseAdmin.rpc('decrement_credits', { uid: user.id }),
      ])
    },
  })

  return result.toTextStreamResponse()
}
