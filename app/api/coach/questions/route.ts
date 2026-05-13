import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pending } = await supabase
    .from('profile_clarifications')
    .select('id, question, context_type, context_ref, created_at')
    .eq('user_id', user.id)
    .is('answer', null)
    .eq('dismissed', false)
    .order('created_at', { ascending: true })

  const { data: answered } = await supabase
    .from('profile_clarifications')
    .select('id, question, answer, context_type, created_at')
    .eq('user_id', user.id)
    .not('answer', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ pending: pending ?? [], answered: answered ?? [] })
}
