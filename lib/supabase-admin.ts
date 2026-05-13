import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// NEVER import this on the client side — SERVICE_ROLE_KEY bypasses all RLS.
// Only use in API routes and server-side code.
let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

// Convenience proxy — call any Supabase method directly
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as never)[prop]
  },
})
