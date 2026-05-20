import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('resume_text, resume_extracted_keywords')
    .eq('id', user.id)
    .single()

  if (!profile?.resume_text) return NextResponse.json({ matched: [], missing: [] })

  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('title, description')
    .eq('id', jobId)
    .single()

  if (!job?.description) return NextResponse.json({ matched: [], missing: [] })

  const prompt = `Extract the key requirements from this job posting and check which ones the candidate meets based on their resume.

Job: ${job.title}
Job description:
${job.description.slice(0, 2000)}

Candidate resume:
${profile.resume_text.slice(0, 2000)}
${profile.resume_extracted_keywords ? `\nExtracted skills: ${profile.resume_extracted_keywords}` : ''}

Return ONLY valid JSON, no markdown:
{
  "matched": ["requirement they meet", "..."],
  "missing": ["requirement they lack", "..."]
}

Rules:
- Max 5 matched, max 4 missing
- Keep each item short (2-5 words): e.g. "Python", "3+ years experience", "Dutch fluency"
- Only include requirements that are clearly stated in the job description
- Be honest — only mark as matched if clearly evidenced in the resume`

  try {
    const { text } = await generateText({ model: anthropic('claude-sonnet-4-6'), prompt })
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const result = JSON.parse(cleaned)
    return NextResponse.json({ matched: result.matched ?? [], missing: result.missing ?? [] })
  } catch {
    return NextResponse.json({ matched: [], missing: [] })
  }
}
