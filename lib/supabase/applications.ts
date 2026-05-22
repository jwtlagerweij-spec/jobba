import { supabaseAdmin } from '@/lib/supabase-admin'

export interface Application {
  id: string
  job_id: string
  user_id: string
  status: string
  notes: string | null
  applied_at: string | null
  updated_at: string
}

export interface ApplicationWithJob extends Application {
  jobs: {
    title: string
    company: string | null
    location: string | null
    url: string
  } | null
}

export async function getUserApplications(userId: string): Promise<ApplicationWithJob[]> {
  const { data } = await supabaseAdmin
    .from('applications')
    .select('*, jobs(title, company, location, url)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return (data ?? []) as ApplicationWithJob[]
}

export async function upsertApplication(
  userId: string,
  jobId: string,
  status: string,
  notes: string | null = null
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('applications')
    .select('applied_at')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .maybeSingle()

  const appliedAt =
    existing?.applied_at ?? (status === 'applied' ? new Date().toISOString() : null)

  await supabaseAdmin.from('applications').upsert(
    {
      user_id: userId,
      job_id: jobId,
      status: status ?? 'saved',
      notes: notes ?? null,
      applied_at: appliedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,job_id' }
  )
}

export async function getApplicationForJob(
  userId: string,
  jobId: string
): Promise<Application | null> {
  const { data } = await supabaseAdmin
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .maybeSingle()
  return data ?? null
}

export async function getApplicationStatusCounts(
  userId: string
): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from('applications')
    .select('status')
    .eq('user_id', userId)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.status) counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return counts
}
