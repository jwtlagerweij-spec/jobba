import { supabaseAdmin } from '@/lib/supabase-admin'

export interface UserProfile {
  id: string
  full_name: string | null
  ai_credits_remaining: number
  resume_text: string | null
}

export interface UserPreferences {
  job_titles: string[]
  location: string
  radius_km: number
  remote_only: boolean
  example_companies: string[]
  sector_preferences: string[]
  job_types: string[]
  job_level: string
  years_in_field: string
  years_total: string
  salary_min: number | null
  salary_max: number | null
  work_arrangement: string[]
  company_size: string[]
  career_direction: string
  dutch_proficiency: string
  management_level: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, ai_credits_remaining, resume_text')
    .eq('id', userId)
    .maybeSingle()
  return data ?? null
}

export async function updateUserFullName(userId: string, fullName: string): Promise<void> {
  await supabaseAdmin.from('profiles').update({ full_name: fullName }).eq('id', userId)
}

export async function getUserPreferences(userId: string): Promise<Partial<UserPreferences>> {
  const { data } = await supabaseAdmin
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data ?? {}
}

export async function upsertUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  await supabaseAdmin
    .from('user_preferences')
    .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' })
}
