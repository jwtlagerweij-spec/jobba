import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Ensures a job is unlocked for a user.
 * - If already unlocked: free, returns true
 * - If not unlocked + credits > 0: spends 1 credit, unlocks, returns true
 * - If not unlocked + no credits: returns false
 */
export async function ensureJobUnlocked(userId: string, jobId: string): Promise<{ ok: boolean; reason?: string }> {
  // Check if already unlocked
  const { data: match } = await supabaseAdmin
    .from('job_matches')
    .select('ai_unlocked')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .order('batch_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (match?.ai_unlocked) return { ok: true }

  // Check credits
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('ai_credits_remaining')
    .eq('id', userId)
    .single()

  if (!profile || (profile.ai_credits_remaining ?? 0) <= 0) {
    return { ok: false, reason: 'No credits remaining.' }
  }

  // Spend 1 credit and unlock this job
  await Promise.all([
    supabaseAdmin.rpc('decrement_credits', { uid: userId }),
    supabaseAdmin
      .from('job_matches')
      .update({ ai_unlocked: true })
      .eq('user_id', userId)
      .eq('job_id', jobId),
  ])

  return { ok: true }
}

export async function isJobUnlocked(userId: string, jobId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('job_matches')
    .select('ai_unlocked')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .order('batch_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.ai_unlocked === true
}
