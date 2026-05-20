'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? 'your email address'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <Logo />
        </div>

        <div className="text-5xl mb-6">📬</div>

        <h1 className="text-2xl font-bold mb-2">Check your inbox</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We sent a confirmation link to
        </p>
        <p className="text-sm font-semibold text-foreground mb-6 break-all">{email}</p>

        <div className="rounded-xl border bg-card p-5 text-left space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What happens next</p>
          {[
            { n: '1', text: 'Click the link in the email to confirm your account.' },
            { n: '2', text: 'Upload your CV — takes 30 seconds.' },
            { n: '3', text: 'Your first personalised matches arrive tomorrow morning.' },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step.n}
              </div>
              <p className="text-sm text-foreground/80 leading-snug">{step.text}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          Can&apos;t find it? Check your spam folder, or{' '}
          <Link href="/signup" className="underline hover:text-foreground">try signing up again</Link>.
        </p>
        <p className="text-xs text-muted-foreground">
          Already confirmed?{' '}
          <Link href="/login" className="underline hover:text-foreground">Sign in here</Link>.
        </p>
      </div>
    </main>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  )
}
