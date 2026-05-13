import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-bold text-lg tracking-tight">Jobba</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            Get started — free
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          Your AI job search assistant for the Netherlands
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          Upload your resume once. Every morning, Jobba finds the best matching vacancies,
          scores them for your profile, and writes a tailored cover letter in one click.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
            Start for free
          </Link>
          <Link href="/jobs" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            Browse jobs
          </Link>
        </div>
      </section>

      <section className="px-6 py-16 border-t">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="font-semibold mb-1">Personalised daily matches</h3>
            <p className="text-sm text-muted-foreground">
              AI reads your resume and scores every vacancy 1–10 for fit. No more endless scrolling.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-3">✉️</div>
            <h3 className="font-semibold mb-1">One-click cover letters</h3>
            <p className="text-sm text-muted-foreground">
              Tailored to the job and your background. Formal or warm — your choice.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-3">🤖</div>
            <h3 className="font-semibold mb-1">AI coach that learns you</h3>
            <p className="text-sm text-muted-foreground">
              Asks targeted questions to sharpen your profile over time. Gets smarter with every answer.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© 2026 Jobba</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
        </div>
      </footer>
    </main>
  )
}
