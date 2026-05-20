import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { job_id, current_content, instruction } = await req.json()
  if (!current_content || !instruction) {
    return Response.json({ error: 'Missing content or instruction.' }, { status: 400 })
  }

  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('title, company, description, language')
    .eq('id', job_id)
    .single()

  const jobLang = job?.language === 'en' ? 'English' : 'Dutch'

  const prompt = `You are helping a job applicant refine their cover letter based on a specific instruction.

Current cover letter:
${current_content}

Job: ${job?.title ?? ''} at ${job?.company ?? ''}

The applicant's instruction: "${instruction}"

Rewrite the cover letter applying this instruction. Keep everything else the same — same language (${jobLang}), same structure, same personal details. Only change what the instruction asks for. Return only the updated cover letter text, nothing else.`

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    onFinish: async ({ text }) => {
      await supabaseAdmin
        .from('cover_letters')
        .update({ content: text, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('job_id', job_id)
    },
  })

  return result.toTextStreamResponse()
}
