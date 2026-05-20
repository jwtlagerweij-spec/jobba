import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import mammoth from 'mammoth'

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('resume') as File | null

  if (!file || !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Please upload a PDF or Word (.docx) file.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 5 MB.' }, { status: 400 })
  }

  const fileBytes = await file.arrayBuffer()
  const isPdf = file.type === 'application/pdf'

  // Upload to Supabase Storage
  const ext = isPdf ? 'pdf' : 'docx'
  const storagePath = `${user.id}/resume.${ext}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('resumes')
    .upload(storagePath, fileBytes, {
      contentType: file.type,
      upsert: true,
    })
  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('resumes')
    .getPublicUrl(storagePath)

  const prompt = `You are analyzing a resume. Extract information and return ONLY valid JSON with this exact structure:
{
  "resume_text": "full verbatim text of the resume",
  "keywords": "comma-separated list: skills, tools, sectors, seniority level, education",
  "job_titles": ["4 to 6 search terms in Dutch and English based on this person's background — mix specific titles and broader terms"],
  "profile_summary": "2-3 sentence friendly summary: who this person is, their background, and what kind of role they're looking for. Write as if you're describing them to a recruiter. Be specific and warm.",
  "experience_level": "one of: student, graduate, junior, medior, senior, lead — infer from total years of work experience: student=currently studying, graduate=0-1yr, junior=1-3yr, medior=3-6yr, senior=6-12yr, lead=12+yr or current people-manager/principal"
}

Return only the JSON object, no markdown, no explanation.`

  let extractedData: {
    resume_text: string
    keywords: string
    job_titles: string[]
    profile_summary: string
    experience_level: string
  }

  try {
    if (isPdf) {
      // Send PDF as document block to Claude
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
    } else {
      // Extract text from .docx using mammoth, then send as plain text to Claude
      const { value: docText } = await mammoth.extractRawText({ buffer: Buffer.from(fileBytes) })
      const { text } = await generateText({
        model: anthropic('claude-sonnet-4-6'),
        messages: [
          {
            role: 'user',
            content: `Here is the resume text extracted from a Word document:\n\n${docText}\n\n${prompt}`,
          },
        ],
      })
      const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      extractedData = JSON.parse(cleaned)
    }
  } catch (err) {
    console.error('Resume extraction error:', err)
    return NextResponse.json({ error: 'Failed to process resume. Please try again.' }, { status: 500 })
  }

  const validLevels = ['student', 'graduate', 'junior', 'medior', 'senior', 'lead']
  const inferredLevel = validLevels.includes(extractedData.experience_level)
    ? extractedData.experience_level
    : 'graduate'

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

  // Seed job_preferences with inferred level if the user has no preferences row yet
  // or is still at the default 'graduate' value (meaning they haven't manually set it)
  const { data: existingPrefs } = await supabaseAdmin
    .from('job_preferences')
    .select('job_level')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingPrefs || existingPrefs.job_level === 'graduate') {
    await supabaseAdmin
      .from('job_preferences')
      .upsert({
        user_id: user.id,
        job_level: inferredLevel,
        experience_level: inferredLevel,
      }, { onConflict: 'user_id' })
  }

  return NextResponse.json({
    profile_summary: extractedData.profile_summary,
    job_titles: extractedData.job_titles,
    keywords: extractedData.keywords,
    experience_level: inferredLevel,
  })
}
