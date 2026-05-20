import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isJobUnlocked } from '@/lib/credits'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [matchRes, applicationRes, coverLetterRes, tailoredResumeRes, profileRes, unlocked] = await Promise.all([
    supabase.from('job_matches').select('fit_score, fit_explanation, batch_date').eq('user_id', user.id).eq('job_id', id).order('batch_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('applications').select('status, notes, applied_at').eq('user_id', user.id).eq('job_id', id).maybeSingle(),
    supabase.from('cover_letters').select('content, tone, version, updated_at').eq('user_id', user.id).eq('job_id', id).maybeSingle(),
    supabase.from('tailored_resumes').select('tailored_text, original_text, version, updated_at').eq('user_id', user.id).eq('job_id', id).maybeSingle(),
    supabase.from('profiles').select('ai_credits_remaining').eq('id', user.id).single(),
    isJobUnlocked(user.id, id),
  ])

  return NextResponse.json({
    job,
    match: matchRes.data,
    application: applicationRes.data,
    cover_letter: coverLetterRes.data,
    tailored_resume: tailoredResumeRes.data,
    credits: profileRes.data?.ai_credits_remaining ?? 0,
    ai_unlocked: unlocked,
  })
}
