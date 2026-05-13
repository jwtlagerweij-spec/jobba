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
      use_resume_for_search: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('Preferences upsert error:', error)
    return NextResponse.json({ error: 'Failed to save preferences.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
