'use client'

import { useState, useEffect } from 'react'

const FAKE_JOBS = [
  {
    score: 9,
    title: 'Junior Brand Manager',
    company: 'Unilever',
    location: 'Rotterdam',
    explanation: "Perfect fit — Lisa's 6-month internship at Unilever gives direct brand exposure. Her Erasmus market research background matches what this role asks for.",
    tier: 'green',
    delay: 0,
  },
  {
    score: 8,
    title: 'Consultant Trainee',
    company: 'McKinsey & Company',
    location: 'Amsterdam',
    explanation: "Strong academic credentials from Erasmus align with the trainee programme. The structured research work is directly relevant to case-based consulting.",
    tier: 'green',
    delay: 150,
  },
  {
    score: 7,
    title: 'Digital Marketing Analyst',
    company: 'Heineken',
    location: 'Amsterdam · Hybrid',
    explanation: "Good commercial instincts from the Unilever internship. The role expects more hands-on digital tooling — but the foundation is solid.",
    tier: 'amber',
    delay: 300,
  },
  {
    score: 3,
    title: 'Investment Banking Analyst',
    company: 'ABN AMRO',
    location: 'Amsterdam',
    explanation: "No finance coursework or internship experience shown. A strong CV overall — but not a match for this specific role.",
    tier: 'red',
    delay: 450,
  },
]

const SCAN_STEPS = [
  { label: 'Reading your resume…', done: false },
  { label: 'Identifying skills & experience…', done: false },
  { label: 'Fetching 47 jobs from Dutch boards…', done: false },
  { label: 'Scoring each job for fit…', done: false },
  { label: 'Ranking your best matches…', done: false },
]

function ResumeCard() {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            L
          </div>
          <div>
            <p className="font-bold text-primary-foreground text-base">Lisa van den Berg</p>
            <p className="text-xs text-primary-foreground/70 mt-0.5">MSc Business Administration · Erasmus University · 2024</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* AI summary */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">What the AI sees</p>
          <p className="text-sm leading-relaxed text-foreground/80">
            Recent Business graduate with hands-on marketing and research experience.
            Strong analytical foundation, international mindset, and a clear trajectory
            toward commercial or strategic roles.
          </p>
        </div>

        {/* Experience */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Experience</p>
          <div className="space-y-2">
            {[
              { role: 'Marketing Intern', company: 'Unilever', period: '6 months' },
              { role: 'Student Research Assistant', company: 'Erasmus Research Centre', period: '1 year' },
            ].map(e => (
              <div key={e.role} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{e.role}</p>
                  <p className="text-xs text-muted-foreground">{e.company}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{e.period}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Skills detected</p>
          <div className="flex flex-wrap gap-1.5">
            {['Market Research', 'Excel & PowerPoint', 'Salesforce', 'Python (basics)', 'Dutch & English (C2)'].map(s => (
              <span key={s} className="text-xs bg-primary/8 text-primary border border-primary/15 rounded-full px-2.5 py-1 font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Search terms */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Search terms Jobba will use</p>
          <div className="flex flex-wrap gap-1.5">
            {['Brand Manager', 'Marketing Trainee', 'Consultant Junior', 'Commercial Analyst', 'Strategy Associate'].map(s => (
              <span key={s} className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScanningCard() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= SCAN_STEPS.length) { clearInterval(interval); return p }
        return p + 1
      })
    }, 600)
    return () => clearInterval(interval)
  }, [])

  const pct = Math.round((progress / SCAN_STEPS.length) * 100)

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-6">
      <div className="text-center py-4">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="currentColor" className="text-primary transition-all duration-500"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{pct}%</span>
          </div>
        </div>
        <p className="font-semibold text-sm">
          {progress < SCAN_STEPS.length ? 'Scanning jobs for Lisa…' : 'Done! Matches ready.'}
        </p>
      </div>

      <div className="space-y-2.5">
        {SCAN_STEPS.map((step, i) => (
          <div key={step.label} className={`flex items-center gap-3 transition-opacity duration-300 ${i < progress ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs transition-colors ${
              i < progress ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i < progress ? '✓' : i + 1}
            </div>
            <p className={`text-sm ${i < progress ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-muted/60 border px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        47 jobs fetched · 12 above score 6 · <span className="text-primary font-medium">4 strong matches found</span>
      </div>
    </div>
  )
}

function JobResultCard({ job, visible }: { job: typeof FAKE_JOBS[0]; visible: boolean }) {
  const colors = {
    green: { badge: 'bg-green-50 text-green-700 border-green-200', ring: 'ring-green-100' },
    amber: { badge: 'bg-amber-50 text-amber-700 border-amber-200', ring: 'ring-amber-100' },
    red:   { badge: 'bg-slate-50 text-slate-500 border-slate-200', ring: 'ring-slate-100' },
  }
  const c = colors[job.tier as keyof typeof colors]

  return (
    <div className={`rounded-2xl border bg-card p-4 transition-all duration-500 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center text-xs font-bold text-primary">
          {job.company[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">{job.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.company} · {job.location}</p>
            </div>
            <span className={`shrink-0 text-xs font-bold border rounded-full px-2 py-0.5 ring-2 ${c.badge} ${c.ring}`}>
              {job.score}/10
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-foreground/70 leading-relaxed border-t mt-3 pt-3">{job.explanation}</p>
    </div>
  )
}

function ResultsCard() {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const timers = FAKE_JOBS.map((job, i) =>
      setTimeout(() => setVisibleCount(c => Math.max(c, i + 1)), job.delay + 200)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lisa's matches today</p>
        <span className="text-xs text-muted-foreground">Sorted by fit · not date</span>
      </div>
      {FAKE_JOBS.map((job, i) => (
        <JobResultCard key={job.title} job={job} visible={i < visibleCount} />
      ))}
    </div>
  )
}

const STEPS = [
  { id: 'resume',   label: 'Resume', icon: '📄', sub: 'AI reads your CV' },
  { id: 'scanning', label: 'Scanning', icon: '🔍', sub: '47 jobs analysed' },
  { id: 'results',  label: 'Matches', icon: '✓', sub: 'Ranked by fit' },
]

export function LandingDemo() {
  const [step, setStep] = useState(0)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => setStep(i)}
              className="flex flex-col items-center gap-1.5 group w-full"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base border-2 transition-all ${
                i === step
                  ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : i < step
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground'
              }`}>
                {i < step ? '✓' : s.icon}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${i === step ? 'text-primary' : i < step ? 'text-primary/70' : 'text-muted-foreground'}`}>{s.label}</p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">{s.sub}</p>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-5 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[420px]">
        {step === 0 && <ResumeCard />}
        {step === 1 && <ScanningCard key="scanning" />}
        {step === 2 && <ResultsCard key="results" />}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors px-3 py-1.5"
        >
          ← Back
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === step ? 'bg-primary w-4' : 'bg-border hover:bg-muted-foreground'}`}
            />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="text-sm font-medium text-primary hover:opacity-80 transition-opacity px-3 py-1.5"
          >
            {step === 0 ? 'See it scan →' : 'See results →'}
          </button>
        ) : (
          <a
            href="/signup"
            className="text-sm font-medium text-primary hover:opacity-80 transition-opacity px-3 py-1.5"
          >
            Try with your CV →
          </a>
        )}
      </div>
    </div>
  )
}
