import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAdzunaJobs } from '@/lib/fetchers/adzuna'

export const maxDuration = 60

// Broad Dutch market terms — independent of any user's CV.
// Covers every major sector so /jobs has diverse listings for all visitors.
const GLOBAL_TERMS = [
  // Business & consulting
  'consultant', 'adviseur', 'manager', 'directeur', 'coordinator',
  // HR & recruitment
  'HR manager', 'recruiter', 'HR adviseur', 'people operations',
  // Legal & compliance
  'jurist', 'paralegal', 'compliance officer', 'legal counsel',
  // Finance
  'accountant', 'controller', 'financieel adviseur', 'boekhouder',
  // Tech
  'software developer', 'UX designer', 'IT manager', 'product manager',
  // Marketing & comms
  'marketing manager', 'communicatie adviseur', 'content manager',
  // Sales
  'sales manager', 'account manager', 'business development',
  // Education
  'docent', 'leraar', 'trainer',
  // Healthcare & social
  'psycholoog', 'coach', 'maatschappelijk werker',
  // Operations
  'operations manager', 'supply chain', 'project manager',
]

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  let totalFetched = 0
  let totalUpserted = 0

  // Run in parallel batches of 6 to stay well inside the 60s limit
  const BATCH_SIZE = 6
  for (let i = 0; i < GLOBAL_TERMS.length; i += BATCH_SIZE) {
    const batch = GLOBAL_TERMS.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(term => fetchAdzunaJobs(term, undefined, 'job'))
    )

    const jobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    totalFetched += jobs.length

    if (jobs.length === 0) continue

    // Deduplicate within this batch
    const seen = new Set<string>()
    const unique = jobs.filter(j => {
      const key = `${j.external_id}:${j.source}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const { data } = await supabaseAdmin
      .from('jobs')
      .upsert(
        unique.map(j => ({
          external_id: j.external_id,
          source: j.source,
          title: j.title,
          company: j.company,
          location: j.location,
          description: j.description,
          url: j.url,
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          posted_at: j.posted_at,
          category: j.category,
          is_remote: j.is_remote,
          language: j.language,
        })),
        { onConflict: 'external_id,source', ignoreDuplicates: true }
      )
      .select('id')

    totalUpserted += data?.length ?? 0
  }

  await supabaseAdmin.from('pipeline_logs').insert({
    run_date: today,
    step: 'global_crawl',
    status: 'ok',
    message: `Fetched ${totalFetched} raw, upserted ${totalUpserted} unique jobs`,
  })

  return NextResponse.json({ ok: true, fetched: totalFetched, upserted: totalUpserted })
}
