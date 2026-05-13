import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  try {
    const userId = Buffer.from(token, 'base64url').toString('utf-8')
    // Validate it looks like a UUID
    if (!/^[0-9a-f-]{36}$/.test(userId)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    await supabaseAdmin
      .from('profiles')
      .update({ email_unsubscribed_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
}
