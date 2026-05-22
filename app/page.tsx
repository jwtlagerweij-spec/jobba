'use client'

import { useState } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Logo, LogoMark } from '@/components/ui/logo'
import { LandingDemo } from '@/components/ui/landing-demo'
import {
  Zap, FileText, BarChart3, MessageSquare, Target, LayoutDashboard,
  Check, ArrowRight, Shield, Users, Globe, Sparkles,
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'about', label: 'About' },
  { id: 'pricing', label: 'Pricing' },
]

const FEATURES = [
  {
    icon: Target,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'Personal fit score',
    body: 'Not keyword matching. AI reads your resume and scores every job 1–10, explaining in plain language exactly why a role fits or doesn\'t.',
  },
  {
    icon: FileText,
    color: 'bg-violet-100 text-violet-600',
    title: 'Cover letter in 30 seconds',
    body: 'Tailored to the job description and your specific background. Edit, regenerate, download — as many times as you need.',
  },
  {
    icon: Zap,
    color: 'bg-cyan-100 text-cyan-600',
    title: 'Resume tailoring per role',
    body: 'Your resume rewritten to surface what matters most for each specific position. Compare before and after side by side.',
  },
  {
    icon: MessageSquare,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Interview preparation',
    body: 'Six likely questions with suggested answers built from your actual CV — your projects, your experience, your words.',
  },
  {
    icon: BarChart3,
    color: 'bg-amber-100 text-amber-600',
    title: 'Application tracker',
    body: 'Kanban board or list view. Track every application from Saved through Offer. Status updates in a single click.',
  },
  {
    icon: LayoutDashboard,
    color: 'bg-rose-100 text-rose-600',
    title: 'AI coach that learns you',
    body: 'Asks targeted questions when your resume has gaps. Each answer sharpens future scoring and personalisation.',
  },
]

const AUDIENCE = [
  {
    label: 'Recent graduates',
    headline: 'Apply smarter, not more.',
    body: "You've sent 40 applications and heard back from two. Jobba tells you which roles you actually have a shot at — and why.",
    cta: 'Find entry-level roles →',
    href: '/jobs',
    gradient: 'from-indigo-500 to-violet-600',
    pill: 'bg-indigo-100 text-indigo-700',
  },
  {
    label: 'Career switchers',
    headline: 'Match where you want to go.',
    body: "You have experience, but want something different. Jobba surfaces roles that match your direction, not just your history.",
    cta: 'Explore new paths →',
    href: '/jobs',
    gradient: 'from-violet-500 to-purple-700',
    pill: 'bg-violet-100 text-violet-700',
  },
  {
    label: 'Busy professionals',
    headline: '10 minutes, not 2 hours.',
    body: "The scan runs overnight. You open the app in the morning, see what fits, and move on with your day.",
    cta: 'Browse all jobs →',
    href: '/jobs',
    gradient: 'from-cyan-500 to-indigo-600',
    pill: 'bg-cyan-100 text-cyan-700',
  },
]

const CATEGORIES = [
  { label: 'Consulting', count: '340+', href: '/jobs?sector=consulting', color: 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100/70' },
  { label: 'Data & Analytics', count: '280+', href: '/jobs?sector=data', color: 'bg-violet-50 border-violet-100 hover:bg-violet-100/70' },
  { label: 'AI & Technology', count: '420+', href: '/jobs?sector=ai-tech', color: 'bg-cyan-50 border-cyan-100 hover:bg-cyan-100/70' },
  { label: 'Strategy & Product', count: '190+', href: '/jobs?sector=strategy', color: 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/70' },
  { label: 'Finance', count: '250+', href: '/jobs?sector=other', color: 'bg-amber-50 border-amber-100 hover:bg-amber-100/70' },
  { label: 'Marketing', count: '160+', href: '/jobs?sector=other', color: 'bg-rose-50 border-rose-100 hover:bg-rose-100/70' },
]

function OverviewTab() {
  return (
    <>
      {/* Hero — gradient background */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-700 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/25 transition-colors mb-8 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-sm shadow-green-300" />
            1,400+ Dutch vacancies updated daily
            <ArrowRight size={11} className="opacity-70" />
          </Link>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.06] text-white text-balance">
            Stop scrolling.
            <br />
            <span className="text-indigo-200">Start matching.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-indigo-100 max-w-lg mx-auto leading-relaxed">
            Upload your CV once. Jobba scores every Dutch vacancy against your profile every morning
            and has your cover letter ready in one click.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-indigo-700 font-semibold px-8 h-12 text-base hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 text-white font-semibold px-8 h-12 text-base hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              Browse jobs
            </Link>
          </div>
          <p className="mt-4 text-xs text-indigo-200/80">No credit card · 2 minutes to first match</p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-3 gap-6">
          {[
            { value: '1,400+', label: 'Dutch vacancies', color: 'text-indigo-600' },
            { value: '< 2 min', label: 'To your first match', color: 'text-violet-600' },
            { value: '30 sec', label: 'Cover letter', color: 'text-cyan-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-3xl sm:text-4xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
              How it works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold">Three steps, then Jobba runs itself</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                n: '1',
                title: 'Upload your CV',
                body: 'Jobba reads your resume with AI — your skills, experience level, and ideal role type. Takes 30 seconds.',
                color: 'bg-indigo-600 text-white',
              },
              {
                n: '2',
                title: 'Get ranked matches every morning',
                body: 'Every day at 9am, Jobba scores Dutch vacancies 1–10 against your profile. Your best fits rise to the top.',
                color: 'bg-violet-600 text-white',
              },
              {
                n: '3',
                title: 'Apply with AI tools',
                body: 'One click generates a tailored cover letter. Your resume gets adjusted. Interview prep is built in.',
                color: 'bg-cyan-600 text-white',
              },
            ].map(step => (
              <div key={step.n} className="relative pl-14">
                <span className={`absolute left-0 top-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${step.color}`}>
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
      <section className="px-6 py-16 bg-gradient-to-b from-indigo-50/60 to-violet-50/40 border-y">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block rounded-full bg-violet-100 text-violet-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
              Live demo
            </span>
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
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
              For every stage
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold">Wherever you are in your career</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {AUDIENCE.map(p => (
              <div
                key={p.label}
                className="rounded-2xl overflow-hidden border hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                <div className={`bg-gradient-to-br ${p.gradient} px-6 py-5`}>
                  <span className={`inline-block rounded-full ${p.pill} text-xs font-semibold px-2.5 py-0.5 mb-2`}>
                    {p.label}
                  </span>
                  <h3 className="text-xl font-bold text-white leading-snug">{p.headline}</h3>
                </div>
                <div className="bg-card px-6 py-5 flex flex-col flex-1 gap-4">
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{p.body}</p>
                  <Link
                    href={p.href}
                    className="text-sm font-semibold text-primary hover:opacity-75 transition-opacity"
                  >
                    {p.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job categories */}
      <section className="px-6 py-16 bg-muted/30 border-y">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-2xl font-bold">Browse by category</h2>
            <Link href="/jobs" className="text-sm text-primary font-medium hover:opacity-75 transition-opacity">
              View all jobs →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href={cat.href}
                className={`group rounded-xl border px-5 py-4 flex items-center justify-between transition-all duration-150 ${cat.color}`}
              >
                <div>
                  <p className="font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.count} jobs</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-300/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <LogoMark className="h-8 w-auto text-white/30 mx-auto mb-8" />
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to find your next role?</h2>
          <p className="text-indigo-200 mb-10 leading-relaxed text-lg">
            Upload your CV, set your preferences, and get your first personalised matches in under
            two minutes.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-indigo-700 rounded-xl px-10 py-4 text-base font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/30"
          >
            Get started for free →
          </Link>
          <p className="mt-4 text-sm text-indigo-300/70">No credit card required</p>
        </div>
      </section>
    </>
  )
}

function FeaturesTab() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <span className="inline-block rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
          Everything included
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Every tool you need to land the role</h2>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Jobba is a complete job search co-pilot — not just a board. Every feature is built
          around your specific background and the Dutch market.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
        {FEATURES.map(f => {
          const Icon = f.icon
          return (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 hover:shadow-md hover:border-foreground/10 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          )
        })}
      </div>

      {/* How the scoring works */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-8 mb-10">
        <h3 className="text-xl font-bold mb-6">How the fit score works</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { range: '8–10', label: 'Strong match', color: 'bg-green-500', desc: 'Your skills and experience closely match what the employer is asking for.' },
            { range: '5–7', label: 'Partial match', color: 'bg-amber-400', desc: 'Some alignment, but there are gaps — useful to know before you apply.' },
            { range: '1–4', label: 'Weak match', color: 'bg-red-400', desc: 'This role is probably not the right fit for where you are right now.' },
          ].map(band => (
            <div key={band.range} className="flex gap-3">
              <div className={`w-2 rounded-full shrink-0 ${band.color}`} style={{ minHeight: '3.5rem' }} />
              <div>
                <p className="font-bold text-lg tabular-nums">{band.range}</p>
                <p className="text-sm font-medium mb-1">{band.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{band.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'text-base px-8 h-12')}>
          Try it free — no credit card
        </Link>
      </div>
    </section>
  )
}

function AboutTab() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-indigo-700 px-6 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/3" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <span className="inline-block rounded-full bg-white/15 text-white text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-6 border border-white/20">
            About Jobba
          </span>
          <h2 className="text-4xl font-bold text-white mb-4">Built for the Dutch job market</h2>
          <p className="text-indigo-100 text-lg leading-relaxed">
            We built Jobba because job searching is broken — too much scrolling, too many generic
            applications, too little signal about what actually fits.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20 space-y-16">
        {/* Mission */}
        <div className="grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
              Our mission
            </span>
            <h3 className="text-2xl font-bold mb-4">Make every Dutch job seeker competitive</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Netherlands has a vibrant job market — but the tools to navigate it are stuck in
              2010. You paste your CV into dozens of forms, write the same cover letter over and
              over, and hope for the best.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Jobba flips this. Your profile is built once, deeply. Then AI does the heavy lifting:
              scoring, writing, preparing — so you spend your time on the conversations that
              actually matter.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-8 space-y-5">
            {[
              { icon: Globe, color: 'text-indigo-600', label: '1,400+ Dutch vacancies', sub: 'Sourced and updated every morning' },
              { icon: Sparkles, color: 'text-violet-600', label: 'AI-powered matching', sub: 'Reads your actual resume, not keywords' },
              { icon: Shield, color: 'text-cyan-600', label: 'Your data stays yours', sub: 'Never sold, never shared with employers' },
              { icon: Users, color: 'text-emerald-600', label: 'Built for all stages', sub: 'Graduate to senior professional' },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <Icon size={18} className={`${item.color} shrink-0 mt-0.5`} />
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Why we built it */}
        <div>
          <span className="inline-block rounded-full bg-violet-100 text-violet-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
            Why we built it
          </span>
          <h3 className="text-2xl font-bold mb-6">The job search experience was broken. We fixed it.</h3>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                before: 'Scroll 200 jobs, apply to 30, hear back from 2.',
                after: 'See 10 scored matches — the ones worth your time.',
                color: 'border-indigo-200 bg-indigo-50/50',
                accent: 'text-indigo-600',
              },
              {
                before: 'Rewrite your cover letter for every application.',
                after: '30 seconds. Personalised. Ready to send.',
                color: 'border-violet-200 bg-violet-50/50',
                accent: 'text-violet-600',
              },
              {
                before: 'Go into interviews blind.',
                after: 'Practice the 6 most likely questions, with your own answers.',
                color: 'border-cyan-200 bg-cyan-50/50',
                accent: 'text-cyan-600',
              },
            ].map((item, i) => (
              <div key={i} className={`rounded-2xl border p-6 ${item.color}`}>
                <p className="text-sm text-muted-foreground line-through mb-3">{item.before}</p>
                <p className={`text-sm font-semibold ${item.accent}`}>✓ {item.after}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div>
          <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
            Our principles
          </span>
          <h3 className="text-2xl font-bold mb-6">What we stand for</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Honest signals, not hype', body: 'We tell you when a role is a bad fit. That\'s more useful than telling you everything looks great.' },
              { title: 'Depth over breadth', body: 'We\'d rather score 100 jobs well than 10,000 jobs badly. Quality matching beats firehose quantity.' },
              { title: 'Your data is yours', body: 'Your CV, your preferences, your applications — we never sell this data or share it with employers without your consent.' },
              { title: 'Built for the Netherlands', body: 'Dutch job market conventions, Dutch companies, Dutch language support. Not a global tool ported over.' },
            ].map(v => (
              <div key={v.title} className="flex gap-3 rounded-xl border bg-card p-5">
                <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">{v.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function PricingTab() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <span className="inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-widest px-3 py-1 mb-4">
          Pricing
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, honest pricing</h2>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Start free. Get real value before you spend a cent.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        {/* Free */}
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">Free</p>
            <p className="text-4xl font-bold mb-1">€0</p>
            <p className="text-sm text-muted-foreground">Forever free to start</p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {[
              'Upload your CV',
              'Daily scored job matches',
              'AI fit explanation per job',
              'Skills gap analysis',
              '3 AI credits (cover letter, resume, interview prep)',
              'Application tracker',
              'Dutch & English language support',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <Check size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="block w-full rounded-xl bg-indigo-600 text-white text-center py-3 font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Get started free →
          </Link>
        </div>

        {/* Pro — coming soon */}
        <div className="rounded-2xl border bg-card p-8 flex flex-col relative overflow-hidden opacity-80">
          <div className="absolute top-4 right-4 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1">
            Coming soon
          </div>
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Pro</p>
            <p className="text-4xl font-bold mb-1">€9<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
            <p className="text-sm text-muted-foreground">Everything in Free, plus:</p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {[
              'Unlimited AI credits',
              'Priority daily scoring',
              'Advanced profile coaching',
              'Resume version history',
              'Analytics: response rates by sector',
              'Early access to new features',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <button
            disabled
            className="block w-full rounded-xl bg-muted text-muted-foreground text-center py-3 font-semibold text-sm cursor-not-allowed"
          >
            Notify me when available
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-bold mb-6 text-center">Common questions</h3>
        <div className="space-y-4">
          {[
            {
              q: 'What are AI credits?',
              a: 'Each AI credit lets you generate a cover letter, tailor your resume, or prepare interview questions for one job. Once you use a credit on a job, that job is permanently unlocked — generate as many versions as you want.',
            },
            {
              q: 'How does the daily scoring work?',
              a: 'Every morning, our AI reads all new Dutch vacancies and scores them against your CV and preferences. You see the results when you open the app. No configuration needed — it just runs.',
            },
            {
              q: 'Is my CV data safe?',
              a: 'Yes. Your resume is stored securely, used only to power your own matching and AI tools, and never shared with employers or third parties. You can delete your account and all data at any time.',
            },
            {
              q: 'Do I need to speak Dutch?',
              a: 'No. Jobba is fully available in English. The job matches include both Dutch and English-language vacancies from across the Netherlands.',
            },
          ].map(item => (
            <div key={item.q} className="rounded-xl border bg-card p-5">
              <p className="font-semibold text-sm mb-2">{item.q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [tab, setTab] = useState('overview')

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 h-14 border-b sticky top-0 bg-background/95 backdrop-blur z-20">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 text-white px-3.5 py-1.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Tab bar */}
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-6 flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'features' && <FeaturesTab />}
        {tab === 'about' && <AboutTab />}
        {tab === 'pricing' && <PricingTab />}
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <LogoMark className="h-3.5 w-auto text-indigo-500" />
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
