import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAndUpsertJobs, scoreJobsForUser } from '@/lib/pipeline'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { DigestEmail, digestSubjectLine } from '@/lib/email-templates/digest'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jobba.io'

export async function GET(req: Request) {
  // Protect with a secret so only Vercel cron can call this
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const resend = new Resend(process.env.RESEND_API_KEY)

  // 1. Get all active users with resumes
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, ai_generated_titles')
    .not('resume_text', 'is', null)
    .eq('onboarding_done', true)
    .is('email_unsubscribed_at', null)

  if (!users || users.length === 0) {
    return NextResponse.json({ ok: true, message: 'No active users' })
  }

  // 2. Collect unique search terms across all users
  const allTerms = new Set<string>()
  for (const u of users) {
    const titles: string[] = u.ai_generated_titles ?? []
    titles.forEach(t => allTerms.add(t))
  }

  // 3. Fetch + upsert jobs once (shared pool)
  let sharedJobs: { id: string; title: string; company: string | null; description: string | null }[] = []
  try {
    sharedJobs = await fetchAndUpsertJobs([...allTerms].slice(0, 8))
    await supabaseAdmin.from('pipeline_logs').insert({
      run_date: today, step: 'fetch', status: 'ok', message: `Fetched ${sharedJobs.length} jobs`,
    })
  } catch (err) {
    await supabaseAdmin.from('pipeline_logs').insert({
      run_date: today, step: 'fetch', status: 'error', message: String(err),
    })
    return NextResponse.json({ error: 'Job fetch failed' }, { status: 500 })
  }

  if (sharedJobs.length === 0) {
    return NextResponse.json({ ok: true, message: 'No new jobs fetched' })
  }

  // 4. Score + email per user
  let emailsSent = 0
  for (const user of users) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('resume_text, resume_extracted_keywords')
        .eq('id', user.id)
        .single()

      if (!profile?.resume_text) continue

      const { data: prefs } = await supabaseAdmin
        .from('job_preferences')
        .select('job_titles, location')
        .eq('user_id', user.id)
        .single()

      // Filter jobs already matched today for this user
      const { data: existingMatches } = await supabaseAdmin
        .from('job_matches')
        .select('job_id')
        .eq('user_id', user.id)
        .eq('batch_date', today)

      const alreadyMatched = new Set((existingMatches ?? []).map(m => m.job_id))
      const jobsToScore = sharedJobs.filter(j => !alreadyMatched.has(j.id)).slice(0, 40)

      if (jobsToScore.length > 0) {
        await scoreJobsForUser(
          user.id,
          profile.resume_text,
          profile.resume_extracted_keywords ?? '',
          jobsToScore,
          today
        )
      }

      // Get today's top matches for email
      const { data: matches } = await supabaseAdmin
        .from('job_matches')
        .select('job_id, fit_score, fit_explanation, email_sent, jobs(id, title, company, location, salary_min, salary_max, is_remote, source, url)')
        .eq('user_id', user.id)
        .eq('batch_date', today)
        .eq('email_sent', false)
        .order('fit_score', { ascending: false })
        .limit(8)

      if (!matches || matches.length === 0) continue

      // Get user email
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(user.id)
      if (!authUser?.email) continue

      const jobsForEmail = matches
        .map(m => {
          const job = Array.isArray(m.jobs) ? m.jobs[0] : m.jobs
          if (!job) return null
          return {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            fit_score: m.fit_score,
            fit_explanation: m.fit_explanation,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            is_remote: job.is_remote,
            source: job.source,
          }
        })
        .filter(Boolean) as Parameters<typeof DigestEmail>[0]['jobs']

      if (jobsForEmail.length === 0) continue

      const firstName = (user.full_name ?? '').split(' ')[0]
      const unsubscribeUrl = `${APP_URL}/email/unsubscribe?token=${Buffer.from(user.id).toString('base64url')}`

      const html = await render(
        DigestEmail({ userName: firstName, jobs: jobsForEmail, appUrl: APP_URL, unsubscribeUrl })
      )

      const { error: emailError } = await resend.emails.send({
        from: 'Jobba <onboarding@resend.dev>',
        to: authUser.email,
        subject: digestSubjectLine(jobsForEmail),
        html,
      })

      if (!emailError) {
        // Mark as sent
        await supabaseAdmin
          .from('job_matches')
          .update({ email_sent: true })
          .eq('user_id', user.id)
          .eq('batch_date', today)

        await supabaseAdmin.from('email_logs').insert({
          user_id: user.id,
          batch_date: today,
          sent_at: new Date().toISOString(),
          job_count: jobsForEmail.length,
        })

        emailsSent++
      } else {
        console.error('Email error for user', user.id, emailError)
      }
    } catch (err) {
      console.error('Pipeline error for user', user.id, err)
      await supabaseAdmin.from('pipeline_logs').insert({
        run_date: today, step: 'email', user_id: user.id, status: 'error', message: String(err),
      })
    }
  }

  await supabaseAdmin.from('pipeline_logs').insert({
    run_date: today, step: 'email', status: 'ok',
    message: `Sent ${emailsSent}/${users.length} emails`,
  })

  return NextResponse.json({ ok: true, users: users.length, emails_sent: emailsSent, jobs_fetched: sharedJobs.length })
}
