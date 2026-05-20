import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  // Delete all user data in dependency order
  await Promise.all([
    supabaseAdmin.from('applications').delete().eq('user_id', uid),
    supabaseAdmin.from('job_matches').delete().eq('user_id', uid),
    supabaseAdmin.from('cover_letters').delete().eq('user_id', uid),
    supabaseAdmin.from('tailored_resumes').delete().eq('user_id', uid),
    supabaseAdmin.from('profile_clarifications').delete().eq('user_id', uid),
    supabaseAdmin.from('email_logs').delete().eq('user_id', uid),
  ])

  await supabaseAdmin.from('job_preferences').delete().eq('user_id', uid)
  await supabaseAdmin.from('profiles').delete().eq('id', uid)

  // Delete auth user (requires service role)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(uid)
  if (error) {
    console.error('Failed to delete auth user:', error)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
