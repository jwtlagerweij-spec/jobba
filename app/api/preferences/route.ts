import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('job_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data ?? {})
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { error } = await supabaseAdmin
    .from('job_preferences')
    .upsert({
      user_id: user.id,
      job_titles: body.job_titles ?? [],
      location: body.location ?? null,
      radius_km: body.radius_km ?? 50,
      remote_only: body.remote_only ?? false,
      example_companies: body.example_companies ?? [],
      sector_preferences: body.sector_preferences ?? [],
      job_type: body.job_type ?? (body.job_types?.[0] ?? 'job'),
      job_types: body.job_types ?? (body.job_type ? [body.job_type] : ['job']),
      experience_level: body.experience_level ?? body.job_level ?? 'graduate',
      job_level: body.job_level ?? body.experience_level ?? 'graduate',
      years_in_field: body.years_in_field ?? '0-2',
      years_total: body.years_total ?? '0-2',
      use_resume_for_search: true,
      // enrichment fields
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      work_arrangement: body.work_arrangement ?? null,
      company_size: body.company_size ?? null,
      career_direction: body.career_direction ?? null,
      dutch_proficiency: body.dutch_proficiency ?? null,
      management_level: body.management_level ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('Preferences upsert error:', error)
    return NextResponse.json({ error: 'Failed to save preferences.' }, { status: 500 })
  }

  // Sync ai_generated_titles with manually set job_titles so the next scan uses the right search terms
  if (body.job_titles?.length > 0) {
    await supabaseAdmin
      .from('profiles')
      .update({ ai_generated_titles: body.job_titles })
      .eq('id', user.id)
  }

  return NextResponse.json({ ok: true })
}
