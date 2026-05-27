import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { aggregateBroadMarket } from '@/lib/sources/aggregator'

export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const jobs = await aggregateBroadMarket(2).catch(err => {
    console.error('aggregateBroadMarket error:', err)
    return []
  })

  if (jobs.length === 0) {
    await supabaseAdmin.from('pipeline_logs').insert({
      run_date: today, step: 'global_crawl', status: 'ok',
      message: 'No jobs returned from any source',
    })
    return NextResponse.json({ ok: true, fetched: 0, upserted: 0 })
  }

  // Upsert in batches of 100 to avoid hitting Supabase payload limits
  const BATCH = 100
  let totalUpserted = 0
  for (let i = 0; i < jobs.length; i += BATCH) {
    const slice = jobs.slice(i, i + BATCH)
    const { data } = await supabaseAdmin
      .from('jobs')
      .upsert(
        slice.map(j => ({
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
    message: `Fetched ${jobs.length} raw (deduped), upserted ${totalUpserted} unique jobs`,
  })

  return NextResponse.json({ ok: true, fetched: jobs.length, upserted: totalUpserted })
}
