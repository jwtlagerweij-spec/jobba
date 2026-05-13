'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function UnsubscribeContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    fetch('/api/email/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.ok ? setStatus('done') : setStatus('error'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Unsubscribing…</p>
          </>
        )}
        {status === 'done' && (
          <>
            <p className="text-2xl">✓</p>
            <h1 className="text-xl font-bold">You&apos;ve been unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You won&apos;t receive daily email digests anymore. You can still use the app to view your matches.</p>
            <Link href="/dashboard" className="text-sm underline text-muted-foreground hover:text-foreground">
              Go to dashboard →
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-2xl">✗</p>
            <h1 className="text-xl font-bold">Invalid link</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has already been used.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}
