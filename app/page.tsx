import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Logo, LogoMark } from '@/components/ui/logo'
import { LandingDemo } from '@/components/ui/landing-demo'

function MockJobCard({ score, title, company, location, explanation, isTop = false }: {
  score: number; title: string; company: string; location: string; explanation: string; isTop?: boolean
}) {
  const color = score >= 8
    ? 'bg-green-50 text-green-700 border-green-200 ring-2 ring-green-100'
    : score >= 6
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200'

  return (
    <div className={`rounded-2xl border bg-white p-5 text-left transition-shadow ${isTop ? 'shadow-md ring-1 ring-primary/10' : 'shadow-sm'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center text-sm font-bold text-primary">
          {company[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{company} · {location}</p>
            </div>
            <span className={`shrink-0 text-xs font-bold border rounded-full px-2.5 py-0.5 ${color}`}>
              {score}/10
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-foreground/70 leading-relaxed border-t pt-3">{explanation}</p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            Get started — free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 border-primary/20 px-3 py-1 text-xs font-medium text-primary mb-6">
          <LogoMark className="h-3 w-auto text-primary" />
          Built for the Dutch job market
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl leading-[1.1]">
          The job search that<br />
          <span className="text-primary">works while you sleep.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          Upload your CV once. Every morning, Jobba scores every Dutch vacancy against your profile,
          ranks the best ones, and has your cover letter ready in one click.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'text-base px-8')}>
            Start for free →
          </Link>
          <Link href="/jobs" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'text-base px-8')}>
            Browse jobs
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No credit card needed · Takes 2 minutes to set up</p>
      </section>

      {/* Interactive demo */}
      <section className="px-6 py-20 bg-muted/20 border-y">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mb-2">See it in action</p>
          <h2 className="text-2xl font-bold text-center mb-2">Watch it work — with a real example</h2>
          <p className="text-sm text-muted-foreground text-center mb-10">
            Lisa is a recent Erasmus graduate looking for her first job. Here is exactly what Jobba does with her CV.
          </p>
          <LandingDemo />
        </div>
      </section>

      {/* Who is this for — persona section */}
      <section className="px-6 py-16 border-y bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mb-2">Who uses Jobba</p>
          <h2 className="text-2xl font-bold text-center mb-10">Wherever you are in your career</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                emoji: '🎓',
                who: 'Recent graduates',
                pain: '"I applied to 40 jobs and heard back from 2. I can\'t tell which ones I actually have a shot at."',
                what: 'Jobba tells you exactly why each job fits you — so you apply smarter, not more.',
              },
              {
                emoji: '📈',
                who: 'Career switchers',
                pain: '"I have experience, but I want something different. I don\'t know where to even start looking."',
                what: 'Upload your CV and set your direction. Jobba finds roles matching where you want to go — not just where you\'ve been.',
              },
              {
                emoji: '⏱️',
                who: 'Busy professionals',
                pain: '"I\'d look for something better, but spending two hours a day on job boards isn\'t an option."',
                what: 'The scan runs overnight. You open the app for 10 minutes, not 2 hours.',
              },
            ].map(p => (
              <div key={p.who} className="rounded-2xl border bg-card p-6 space-y-3">
                <span className="text-2xl">{p.emoji}</span>
                <h3 className="font-semibold text-sm">{p.who}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed italic">{p.pain}</p>
                <p className="text-xs leading-relaxed text-foreground/80 border-t pt-3">{p.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* "This is what you wake up to" */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mb-2">This is what you wake up to</p>
          <h2 className="text-2xl font-bold text-center mb-8">Your top matches, ranked by fit — not by date</h2>
          <div className="space-y-3">
            <MockJobCard
              isTop
              score={9}
              title="Strategy Consultant"
              company="McKinsey & Company"
              location="Amsterdam"
              explanation="Strong fit — your strategy coursework and internship at a Big Four firm directly match this role's focus on tech-enabled transformation. Academic research in digital strategy is a clear differentiator."
            />
            <MockJobCard
              score={8}
              title="Data & AI Consultant"
              company="Deloitte"
              location="Rotterdam · Hybrid"
              explanation="Python and SQL skills match the technical requirements. The analytics and reporting work from your internship maps well to the junior responsibilities in this role."
            />
            <MockJobCard
              score={7}
              title="Digital Analyst Trainee"
              company="Picnic Technologies"
              location="Amsterdam"
              explanation="Good cultural fit based on your sector preferences. The role requires some SQL experience you have — though the product-specific tooling would be new."
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">Your actual matches will be scored against your real resume and profile.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-y bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Three steps, then Jobba runs itself</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload your CV',
                body: 'Jobba reads your resume with AI to understand your skills, experience level, and what kind of roles you\'d excel in. Takes 30 seconds.',
              },
              {
                step: '02',
                title: 'Get scored matches every morning',
                body: 'Every day at 9am, Jobba searches Dutch job boards and scores each vacancy 1–10 for fit against YOUR profile. You see the best ones first.',
              },
              {
                step: '03',
                title: 'Apply with AI-powered tools',
                body: 'One click generates a cover letter tailored to the job and your background. Your resume gets adjusted to match. Interview prep included.',
              },
            ].map(item => (
              <div key={item.step}>
                <p className="text-4xl font-bold text-primary/20 mb-4 font-mono">{item.step}</p>
                <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Everything you need to land your next role</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: '🎯',
                title: 'Personal fit score on every job',
                body: 'Not keyword matching — AI reads your actual resume and explains in 2 sentences exactly why a job fits or doesn\'t.',
              },
              {
                icon: '✉️',
                title: 'Cover letter in 30 seconds',
                body: 'Tailored to the job description and your specific experience. Formal or warm tone. Edit it, regenerate it, download it.',
              },
              {
                icon: '📄',
                title: 'Resume tailoring per job',
                body: 'See your resume rewritten to highlight what matters most for each specific role. Before and after, side by side.',
              },
              {
                icon: '🎤',
                title: 'Interview prep',
                body: 'Get 6 likely interview questions with suggested answers based on your actual CV — referencing your real projects and experience.',
              },
              {
                icon: '📊',
                title: 'Application tracker',
                body: 'Track every application from Saved to Offer in one place. Notes, status updates, and follow-up reminders built in.',
              },
              {
                icon: '🤖',
                title: 'AI coach that learns you',
                body: 'Asks targeted questions when your resume has gaps. Each answer sharpens future scoring and cover letter quality.',
              },
            ].map(f => (
              <div key={f.title} className="rounded-xl bg-card border p-5 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why not LinkedIn */}
      <section className="px-6 py-20 border-y bg-muted/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">LinkedIn sends you everything.<br />Jobba sends you what fits.</h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Generic job alerts are noise. Jobba understands your background — your actual skills,
            your education, your sector — and only surfaces roles where you have a real shot.
            The score tells you why. The tools help you apply in minutes.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-left">
            {[
              { label: 'Jobs scored daily', value: '100+' },
              { label: 'Minutes to first match', value: '< 2' },
              { label: 'Cover letter time', value: '30s' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 bg-primary">
        <div className="max-w-xl mx-auto text-center">
          <LogoMark className="h-8 w-auto text-primary-foreground/40 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4 text-primary-foreground">Ready to stop scrolling?</h2>
          <p className="text-primary-foreground/70 mb-8 leading-relaxed">
            Upload your CV, set your preferences, and get your first personalized matches in under 2 minutes.
            Free to start — no credit card needed.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-primary-foreground text-primary rounded-xl px-8 py-3.5 text-base font-semibold hover:opacity-90 transition-opacity"
          >
            Get started for free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <LogoMark className="h-3.5 w-auto text-primary/60" />
          <span>© 2026 Jobba · Built for the Dutch job market</span>
        </div>
        <div className="flex gap-4">
          <Link href="/jobs" className="hover:text-foreground">Job board</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
        </div>
      </footer>

    </main>
  )
}
