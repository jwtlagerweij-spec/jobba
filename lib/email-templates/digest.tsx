import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface Job {
  id: string
  title: string
  company: string | null
  location: string | null
  fit_score: number
  fit_explanation: string | null
  salary_min: number | null
  salary_max: number | null
  is_remote: boolean
  source: string
}

interface DigestEmailProps {
  userName: string
  jobs: Job[]
  appUrl: string
  unsubscribeUrl: string
}

const sourceLabel: Record<string, string> = {
  adzuna: 'Adzuna',
  nvb: 'Nationale Vacaturebank',
  intermediair: 'Intermediair',
  manual: 'Added by you',
}

function scoreColor(score: number): string {
  if (score >= 8) return '#16a34a'
  if (score >= 6) return '#d97706'
  return '#dc2626'
}

export function DigestEmail({ userName, jobs, appUrl, unsubscribeUrl }: DigestEmailProps) {
  const topJob = jobs[0]
  const rest = jobs.slice(1)
  const preview = topJob
    ? `${topJob.fit_score}/10 match at ${topJob.company ?? topJob.title} — and ${jobs.length - 1} more job${jobs.length !== 2 ? 's' : ''} for you today`
    : `${jobs.length} new job match${jobs.length !== 1 ? 'es' : ''} for you today`

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '0 16px' }}>

          {/* Header */}
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>Jobba</Text>
            <Text style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
              Good morning{userName ? `, ${userName}` : ''} — here are your matches for today.
            </Text>
          </Section>

          {/* Hero card — top job */}
          {topJob && (
            <Section style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  backgroundColor: scoreColor(topJob.fit_score),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: '700', fontSize: '16px', flexShrink: 0,
                }}>
                  {topJob.fit_score}
                </div>
                <div>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>{topJob.title}</Text>
                  <Text style={{ margin: '2px 0 0', fontSize: '14px', color: '#6b7280' }}>
                    {topJob.company ?? 'Unknown company'} · {topJob.location ?? 'Location unknown'}{topJob.is_remote ? ' · Remote' : ''}
                  </Text>
                </div>
              </div>

              {(topJob.salary_min || topJob.salary_max) && (
                <Text style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }}>
                  €{topJob.salary_min?.toLocaleString()} – €{topJob.salary_max?.toLocaleString()}
                </Text>
              )}

              {topJob.fit_explanation && (
                <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                  {topJob.fit_explanation}
                </Text>
              )}

              <Button
                href={`${appUrl}/jobs/${topJob.id}`}
                style={{
                  backgroundColor: '#111827', color: '#ffffff', borderRadius: '8px',
                  padding: '10px 20px', fontSize: '14px', fontWeight: '600',
                  textDecoration: 'none', display: 'inline-block',
                }}
              >
                View job →
              </Button>

              <Text style={{ fontSize: '11px', color: '#9ca3af', margin: '10px 0 0' }}>
                via {sourceLabel[topJob.source] ?? topJob.source}
              </Text>
            </Section>
          )}

          {/* Remaining jobs */}
          {rest.map(job => (
            <Section key={job.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: scoreColor(job.fit_score),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: '700', fontSize: '13px', flexShrink: 0,
                }}>
                  {job.fit_score}
                </div>
                <div style={{ flex: 1 }}>
                  <Link href={`${appUrl}/jobs/${job.id}`} style={{ fontSize: '14px', fontWeight: '600', color: '#111827', textDecoration: 'none' }}>
                    {job.title}
                  </Link>
                  <Text style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                    {job.company ?? 'Unknown'} · {job.location ?? 'Unknown'}{job.is_remote ? ' · Remote' : ''}
                  </Text>
                  {job.fit_explanation && (
                    <Text style={{ margin: '6px 0 0', fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                      {job.fit_explanation}
                    </Text>
                  )}
                </div>
              </div>
            </Section>
          ))}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          {/* Footer */}
          <Section>
            <Button
              href={`${appUrl}/dashboard`}
              style={{
                backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '8px',
                padding: '10px 20px', fontSize: '14px', fontWeight: '500',
                textDecoration: 'none', display: 'inline-block', marginBottom: '16px',
              }}
            >
              Open dashboard
            </Button>
            <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              You&apos;re receiving this because you signed up for Jobba.{' '}
              <Link href={unsubscribeUrl} style={{ color: '#9ca3af' }}>Unsubscribe</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export function digestSubjectLine(jobs: Job[]): string {
  if (jobs.length === 0) return 'Your Jobba matches for today'
  const top = jobs[0]
  const rest = jobs.length - 1
  return rest > 0
    ? `${top.fit_score}/10 match at ${top.company ?? top.title} — and ${rest} more for you today`
    : `${top.fit_score}/10 match at ${top.company ?? top.title}`
}
