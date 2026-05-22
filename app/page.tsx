import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Logo, LogoMark } from '@/components/ui/logo'
import { LandingDemo } from '@/components/ui/landing-demo'

const CATEGORIES = [
  { label: 'Consulting', count: '340+', href: '/jobs?sector=consulting' },
  { label: 'Data & Analytics', count: '280+', href: '/jobs?sector=data' },
  { label: 'AI & Technology', count: '420+', href: '/jobs?sector=ai-tech' },
  { label: 'Strategy & Product', count: '190+', href: '/jobs?sector=strategy' },
  { label: 'Finance', count: '250+', href: '/jobs?sector=other' },
  { label: 'Marketing', count: '160+', href: '/jobs?sector=other' },
]

const FEATURES = [
  {
    title: 'Personal fit score on every job',
    body: "Not keyword matching. AI reads your actual resume and explains in plain language exactly why a role fits or doesn't.",
  },
  {
    title: 'Cover letter in 30 seconds',
    body: 'Tailored to the job description and your specific background. Edit, regenerate, download — as many times as you need.',
  },
  {
    title: 'Resume tailoring per role',
    body: 'Your resume rewritten to surface what matters most for each specific position. Compare before and after.',
  },
  {
    title: 'Interview preparation',
    body: 'Six likely questions with suggested answers built from your actual CV — your projects, your experience, your words.',
  },
  {
    title: 'Application tracker',
    body: 'Kanban board or list view. Track every application from Saved through Offer. Status updates in a single click.',
  },
  {
    title: 'AI coach that learns you',
    body: 'Asks targeted questions when your resume has gaps. Each answer sharpens future scoring and personalisation.',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 h-14 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            Get started — free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-28 pb-24 text-center">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:border-foreground/30 transition-colors mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          1,400+ Dutch vacancies updated daily
          <span className="text-muted-foreground/60">→</span>
        </Link>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl leading-[1.06] text-balance">
          Stop scrolling.
          <br />
          <span className="text-primary">Start matching.</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
          Upload your CV once. Jobba scores every Dutch vacancy against your
          profile every morning and has your cover letter ready in one click.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: 'lg' }), 'text-base px-8 h-12')}
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/jobs"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'text-base px-8 h-12'
            )}
          >
            Browse jobs
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card · 2 minutes to first match
        </p>
      </section>

      {/* Stats strip */}
      <section className="border-y bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '100+', label: 'Jobs scored daily' },
            { value: '< 2 min', label: 'To your first match' },
            { value: '30 sec', label: 'Cover letter' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Three steps, then Jobba runs itself
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-12">
            {[
              {
                n: '1',
                title: 'Upload your CV',
                body: "Jobba reads your resume with AI — your skills, experience level, and ideal role type. Takes 30 seconds.",
              },
              {
                n: '2',
                title: 'Get ranked matches every morning',
                body: "Every day at 9am, Jobba scores Dutch vacancies 1–10 against your profile. Your best fits rise to the top.",
              },
              {
                n: '3',
                title: 'Apply with AI tools',
                body: "One click generates a tailored cover letter. Your resume gets adjusted. Interview prep is built in.",
              },
            ].map(step => (
              <div key={step.n} className="relative pl-14">
                <span className="absolute left-0 top-0 w-9 h-9 rounded-full border-2 border-primary/20 flex items-center justify-center text-sm font-bold text-primary/60">
                  {step.n}
                </span>
                <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive demo */}
      <section className="px-6 py-20 border-y bg-muted/20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Live demo
            </p>
            <h2 className="text-3xl font-bold mb-3">See it work with a real CV</h2>
            <p className="text-sm text-muted-foreground">
              Lisa is a recent Erasmus graduate looking for her first role. Here is exactly what
              Jobba does with her resume.
            </p>
          </div>
          <LandingDemo />
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              For every stage
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Wherever you are in your career
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                label: 'Recent graduates',
                headline: 'Apply smarter, not more.',
                body: "You've sent 40 applications and heard back from two. Jobba tells you which roles you actually have a shot at — and why.",
                cta: 'Find entry-level roles',
                href: '/jobs',
              },
              {
                label: 'Career switchers',
                headline: 'Match where you want to go.',
                body: "You have experience, but want something different. Jobba surfaces roles that match your direction, not just your history.",
                cta: 'Explore new paths',
                href: '/jobs',
              },
              {
                label: 'Busy professionals',
                headline: '10 minutes, not 2 hours.',
                body: "The scan runs overnight. You open the app in the morning, see what fits, and move on with your day.",
                cta: 'Browse all jobs',
                href: '/jobs',
              },
            ].map(p => (
              <div
                key={p.label}
                className="rounded-xl border bg-card p-7 flex flex-col gap-4 hover:border-primary/30 hover:shadow-md transition-all duration-150"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {p.label}
                </p>
                <h3 className="text-xl font-bold leading-snug">{p.headline}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{p.body}</p>
                <Link
                  href={p.href}
                  className="text-sm font-medium text-primary hover:opacity-75 transition-opacity"
                >
                  {p.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job categories */}
      <section className="px-6 py-20 border-y bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-2xl font-bold">Browse by category</h2>
            <Link
              href="/jobs"
              className="text-sm text-primary font-medium hover:opacity-75 transition-opacity"
            >
              View all jobs →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group rounded-xl border bg-card px-5 py-4 flex items-center justify-between hover:border-primary/40 hover:shadow-sm transition-all duration-150"
              >
                <div>
                  <p className="font-medium text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.count} jobs</p>
                </div>
                <span className="text-muted-foreground group-hover:text-primary transition-colors">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Everything included
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Every tool you need to land the role
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-6 hover:border-primary/30 hover:shadow-sm transition-all duration-150"
              >
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 bg-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <LogoMark className="h-8 w-auto text-background/30 mx-auto mb-8" />
          <h2 className="text-4xl font-bold mb-4 text-background">
            Ready to find your next role?
          </h2>
          <p className="text-background/60 mb-10 leading-relaxed text-lg">
            Upload your CV, set your preferences, and get your first personalised matches
            in under two minutes.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-background text-foreground rounded-xl px-10 py-4 text-base font-semibold hover:opacity-90 transition-opacity"
          >
            Get started for free →
          </Link>
          <p className="mt-4 text-sm text-background/40">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <LogoMark className="h-3.5 w-auto text-primary/60" />
          <span>© 2026 Jobba · Built for the Dutch job market</span>
        </div>
        <div className="flex gap-5">
          <Link href="/jobs" className="hover:text-foreground transition-colors">Job board</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>
    </main>
  )
}
