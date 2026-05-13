import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, manual_text } = await req.json()
  if (!url && !manual_text) {
    return NextResponse.json({ error: 'Provide a URL or job description text.' }, { status: 400 })
  }

  // Get user resume for scoring
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('resume_text, resume_extracted_keywords')
    .eq('id', user.id)
    .single()

  if (!profile?.resume_text) {
    return NextResponse.json({ error: 'Upload your resume first.' }, { status: 400 })
  }

  // Try to fetch page content via Jina AI reader (free, no key needed)
  let pageContent = manual_text ?? ''
  if (url && !manual_text) {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(10000),
      })
      if (jinaRes.ok) {
        pageContent = await jinaRes.text()
        pageContent = pageContent.slice(0, 8000) // cap to avoid huge prompts
      }
    } catch {
      // Jina failed — will rely on manual_text or return error
    }
  }

  if (!pageContent || pageContent.trim().length < 50) {
    return NextResponse.json({
      error: 'Could not fetch the job page automatically.',
      needs_manual: true,
    }, { status: 422 })
  }

  // Extract job details with Claude
  const extractPrompt = `Extract the job posting details from the text below and return ONLY valid JSON:
{
  "title": "job title",
  "company": "company name or null",
  "location": "city/country or 'Remote' or null",
  "description": "full job description text — keep it complete",
  "salary_min": null or integer in euros,
  "salary_max": null or integer in euros
}

Job page content:
${pageContent}`

  let extracted: {
    title: string
    company: string | null
    location: string | null
    description: string
    salary_min: number | null
    salary_max: number | null
  }

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt: extractPrompt,
    })
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    extracted = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Failed to extract job details. Try pasting the description manually.' }, { status: 500 })
  }

  if (!extracted.title) {
    return NextResponse.json({ error: 'Could not find a job title. Try pasting the description manually.' }, { status: 422 })
  }

  // Use URL as external_id to prevent duplicates
  const externalId = url ?? `manual-${Date.now()}`
  const desc = extracted.description ?? ''

  // Upsert job into shared jobs table
  const { data: savedJob, error: jobError } = await supabaseAdmin
    .from('jobs')
    .upsert({
      external_id: externalId,
      source: 'manual',
      title: extracted.title,
      company: extracted.company,
      location: extracted.location,
      description: desc,
      url: url ?? '',
      salary_min: extracted.salary_min,
      salary_max: extracted.salary_max,
      posted_at: new Date().toISOString(),
      category: assignCategory(extracted.title, desc),
      is_remote: detectRemote(extracted.title, desc),
      language: detectLanguage(desc),
    }, { onConflict: 'external_id,source' })
    .select('id')
    .single()

  if (jobError || !savedJob) {
    return NextResponse.json({ error: 'Failed to save job.' }, { status: 500 })
  }

  // Score the job against user resume
  const scoringPrompt = `Score this job for the candidate and return ONLY valid JSON:
{ "score": <integer 1-10>, "explanation": "<2 sentences: why it fits or doesn't fit this specific candidate>" }

Resume:
${profile.resume_text.slice(0, 3000)}

${profile.resume_extracted_keywords ? `Skills: ${profile.resume_extracted_keywords}` : ''}

Job: ${extracted.title} at ${extracted.company ?? 'Unknown'}
${desc.slice(0, 1500)}`

  let fitScore = 5
  let fitExplanation = 'Manually added job — score estimated from your profile.'

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt: scoringPrompt,
    })
    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const scored = JSON.parse(cleaned)
    fitScore = Math.min(10, Math.max(1, scored.score))
    fitExplanation = scored.explanation
  } catch {
    // use defaults
  }

  const today = new Date().toISOString().split('T')[0]
  await supabaseAdmin
    .from('job_matches')
    .upsert({
      user_id: user.id,
      job_id: savedJob.id,
      batch_date: today,
      fit_score: fitScore,
      fit_explanation: fitExplanation,
      email_sent: false,
      user_viewed: false,
    }, { onConflict: 'user_id,job_id,batch_date' })

  return NextResponse.json({
    job_id: savedJob.id,
    title: extracted.title,
    company: extracted.company,
    fit_score: fitScore,
    fit_explanation: fitExplanation,
  })
}
