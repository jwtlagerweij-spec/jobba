import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: matchId } = await params
  const { feedback } = await req.json()

  if (feedback !== 1 && feedback !== -1 && feedback !== null) {
    return NextResponse.json({ error: 'feedback must be 1, -1, or null' }, { status: 400 })
  }

  const { error } = await supabase
    .from('job_matches')
    .update({ user_feedback: feedback })
    .eq('id', matchId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
