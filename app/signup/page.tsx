'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export default function SignupPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()

    if (!consent) {
      toast.error('You must agree to the Terms and Privacy Policy to create an account.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || null },
        emailRedirectTo: `${window.location.origin}/onboarding/upload`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          consent_accepted_at: new Date().toISOString(),
          consent_version: '1.0',
        })
        .eq('id', data.user.id)
    }

    // If email confirmation is required, go to check-email page
    if (data.session) {
      router.push('/onboarding/upload')
    } else {
      router.push(`/check-email?email=${encodeURIComponent(email)}`)
    }
    router.refresh()
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">

      {/* Left — value panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <Logo iconClassName="text-primary-foreground" textClassName="text-primary-foreground" />

        <div className="space-y-8">
          <div>
            <p className="text-primary-foreground/60 text-sm font-medium uppercase tracking-widest mb-3">What you get</p>
            <ul className="space-y-4">
              {[
                { icon: '🎯', text: 'A fit score on every Dutch job — so you only apply where you have a real shot.' },
                { icon: '✉️', text: 'A tailored cover letter in 30 seconds, ready to send.' },
                { icon: '📊', text: 'Your top matches delivered every morning. No scrolling required.' },
              ].map(item => (
                <li key={item.icon} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <p className="text-primary-foreground/85 text-sm leading-relaxed">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/15 p-5">
            <p className="text-primary-foreground/85 text-sm leading-relaxed italic mb-3">
              &ldquo;I uploaded my CV on Sunday evening. Monday morning I had 12 scored matches in my inbox — 3 of them I hadn&apos;t found myself.&rdquo;
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold text-primary-foreground">S</div>
              <p className="text-xs text-primary-foreground/60">Sanne, MSc graduate · Amsterdam</p>
            </div>
          </div>
        </div>

        <p className="text-primary-foreground/40 text-xs">Free to start · No credit card needed</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Free · Takes 2 minutes · Your first matches arrive tomorrow morning
            </p>
          </div>

          {/* Steps preview */}
          <div className="flex items-center gap-2 mb-8 p-3 rounded-xl bg-muted/50 border">
            {[
              { n: '1', label: 'Sign up' },
              { n: '2', label: 'Upload CV' },
              { n: '3', label: 'Get matches' },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step.n}
                </div>
                <span className={`text-xs font-medium ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                {i < 2 && <div className="flex-1 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                Name <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                placeholder="Emma van der Berg"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                placeholder="At least 8 characters"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-foreground"
              />
              <span className="text-sm text-muted-foreground leading-snug">
                I agree to Jobba&apos;s{' '}
                <Link href="/terms" target="_blank" className="text-foreground underline underline-offset-4">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-foreground underline underline-offset-4">Privacy Policy</Link>
                , including the processing of my resume by AI to provide the service.
              </span>
            </label>

            <Button type="submit" className="w-full text-base py-5" disabled={loading || !consent}>
              {loading ? 'Creating account…' : 'Create free account →'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your data is stored in the EU and never sold.
          </p>
        </div>
      </div>
    </main>
  )
}
