import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('resume') as File | null
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Please upload a PDF file.' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5 MB.' }, { status: 400 })
  }

  // Upload to Supabase Storage (bucket: 'resumes' — create this in Supabase dashboard)
  const fileBytes = await file.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage
    .from('resumes')
    .upload(`${user.id}/resume.pdf`, fileBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('resumes')
    .getPublicUrl(`${user.id}/resume.pdf`)

  // Send PDF to Claude for extraction
  const prompt = `You are analyzing a resume PDF. Extract information and return ONLY valid JSON with this exact structure:
{
  "resume_text": "full verbatim text of the resume",
  "keywords": "comma-separated list: skills, tools, sectors, seniority level, education",
  "job_titles": ["4 to 6 search terms in Dutch and English based on this person's background — mix specific titles and broader terms"],
  "profile_summary": "2-3 sentence friendly summary: who this person is, their background, and what kind of role they're looking for. Write as if you're describing them to a recruiter. Be specific and warm."
}

Return only the JSON object, no markdown, no explanation.`

  let extractedData: {
    resume_text: string
    keywords: string
    job_titles: string[]
    profile_summary: string
  }

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data: new Uint8Array(fileBytes),
              mediaType: 'application/pdf',
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    extractedData = JSON.parse(cleaned)
  } catch (err) {
    console.error('Claude extraction error:', err)
    return NextResponse.json({ error: 'Failed to process resume. Please try again.' }, { status: 500 })
  }

  // Save to profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      resume_url: publicUrl,
      resume_text: extractedData.resume_text,
      resume_extracted_keywords: extractedData.keywords,
      ai_generated_titles: extractedData.job_titles,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Profile update error:', profileError)
    return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 })
  }

  return NextResponse.json({
    profile_summary: extractedData.profile_summary,
    job_titles: extractedData.job_titles,
    keywords: extractedData.keywords,
  })
}
