'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { AppNav } from '@/components/ui/app-nav'

interface Profile {
  full_name: string
  email: string
  ai_credits_remaining: number
  has_resume: boolean
}

interface Prefs {
  job_titles: string[]
  location: string
  radius_km: number
  remote_only: boolean
  example_companies: string[]
  sector_preferences: string[]
  job_types: string[]
  job_level: string
  years_in_field: string
  years_total: string
  salary_min: number | null
  salary_max: number | null
  work_arrangement: string[]
  company_size: string[]
  career_direction: string
  dutch_proficiency: string
  management_level: string
}

const JOB_TYPES = [
  { value: 'job', label: 'Job' },
  { value: 'internship', label: 'Internship' },
  { value: 'traineeship', label: 'Traineeship' },
  { value: 'any', label: 'All types' },
]

const JOB_LEVELS = [
  { value: 'student', label: 'Student' },
  { value: 'graduate', label: 'Recent graduate' },
  { value: 'junior', label: 'Junior' },
  { value: 'medior', label: 'Medior' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Principal' },
]

const YEARS_OPTIONS = ['0-2', '3-5', '6-10', '10+']

const WORK_ARRANGEMENTS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const COMPANY_SIZES = [
  { value: 'startup',       label: 'Startup (<50)' },
  { value: 'scaleup',       label: 'Scale-up (50–500)' },
  { value: 'sme',           label: 'SME' },
  { value: 'corporate',     label: 'Large corporate' },
  { value: 'multinational', label: 'Multinational' },
]

const DUTCH_PROFICIENCY_OPTIONS = [
  { value: 'native', label: 'Native' },
  { value: 'fluent', label: 'Fluent (C1/C2)' },
  { value: 'basic',  label: 'Basic (A1–B1)' },
  { value: 'none',   label: 'No Dutch' },
]

const MANAGEMENT_LEVELS = [
  { value: 'ic',        label: 'Individual contributor' },
  { value: 'lead',      label: 'Team / tech lead' },
  { value: 'manager',   label: 'Manager / Head of' },
  { value: 'director',  label: 'Director / VP' },
  { value: 'executive', label: 'C-level / Board' },
]

function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string
}) {
  const [input, setInput] = useState('')
  function add() {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed])
    setInput('')
  }
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 bg-muted text-sm rounded-full px-3 py-1">
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))} className="text-muted-foreground hover:text-foreground leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  )
}

function completenessItems(profile: Profile, prefs: Prefs) {
  return [
    { label: 'Resume uploaded', done: profile.has_resume, href: '/onboarding/upload?from=profile' },
    { label: 'Name set', done: !!profile.full_name.trim(), href: null },
    { label: 'Career level chosen', done: !!prefs.job_level, href: null },
    { label: 'Job titles added', done: prefs.job_titles.length > 0, href: null },
    { label: 'Location set', done: !!prefs.location.trim(), href: null },
    { label: 'Sector preferences', done: prefs.sector_preferences.length > 0, href: null },
  ]
}

function ChipSelect({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} type="button"
            onClick={() => onChange(value === o.value ? '' : o.value)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              value === o.value ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:border-foreground/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MultiChipSelect({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} type="button"
            onClick={() => toggle(o.value)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              value.includes(o.value) ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:border-foreground/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>({ full_name: '', email: '', ai_credits_remaining: 0, has_resume: false })
  const [prefs, setPrefs] = useState<Prefs>({
    job_titles: [], location: '', radius_km: 50,
    remote_only: false, example_companies: [], sector_preferences: [],
    job_types: ['job'], job_level: 'graduate', years_in_field: '0-2', years_total: '0-2',
    salary_min: null, salary_max: null, work_arrangement: [], company_size: [],
    career_direction: '', dutch_proficiency: '', management_level: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rescoring, setRescoring] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, ai_credits_remaining, resume_text').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setProfile({
            full_name: data.full_name ?? '',
            email: user.email ?? '',
            ai_credits_remaining: data.ai_credits_remaining ?? 0,
            has_resume: !!data.resume_text,
          })
        })
    })

    fetch('/api/preferences').then(r => r.json()).then(data => {
      setPrefs({
        job_titles: data.job_titles ?? [],
        location: data.location ?? '',
        radius_km: data.radius_km ?? 50,
        remote_only: data.remote_only ?? false,
        example_companies: data.example_companies ?? [],
        sector_preferences: data.sector_preferences ?? [],
        job_types: data.job_types ?? (data.job_type ? [data.job_type] : ['job']),
        job_level: data.job_level ?? 'graduate',
        years_in_field: data.years_in_field ?? '0-2',
        years_total: data.years_total ?? '0-2',
        salary_min: data.salary_min ?? null,
        salary_max: data.salary_max ?? null,
        work_arrangement: data.work_arrangement ?? [],
        company_size: data.company_size ?? [],
        career_direction: data.career_direction ?? '',
        dutch_proficiency: data.dutch_proficiency ?? '',
        management_level: data.management_level ?? '',
      })
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user.id)
      const res = await fetch('/api/preferences', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error('Failed to save preferences')
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save. Try again.')
    }
    setSaving(false)
  }

  async function handleRescore() {
    setRescoring(true)
    try {
      await fetch('/api/preferences', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs),
      })
      const res = await fetch('/api/scan/rescore', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Done! Re-scored ${data.rescored} jobs with your updated preferences.`)
    } catch {
      toast.error('Rescore failed. Try again.')
    }
    setRescoring(false)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Account deleted.')
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      toast.error('Failed to delete account. Contact support.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const completeness = completenessItems(profile, prefs)
  const score = Math.round((completeness.filter(c => c.done).length / completeness.length) * 100)
  const missing = completeness.filter(c => !c.done)

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <span className="text-xs text-muted-foreground">{profile.ai_credits_remaining} AI credit{profile.ai_credits_remaining !== 1 ? 's' : ''} remaining</span>
        </div>

        {/* Profile completeness */}
        {score < 100 && (
          <div className="rounded-xl border bg-amber-50 border-amber-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-amber-900">Profile {score}% complete</p>
              <span className="text-xs text-amber-700">{missing.length} item{missing.length !== 1 ? 's' : ''} missing</span>
            </div>
            <div className="h-1.5 bg-amber-200 rounded-full mb-3">
              <div className="h-1.5 bg-amber-500 rounded-full transition-all" style={{ width: `${score}%` }} />
            </div>
            <ul className="space-y-1">
              {missing.map(item => (
                <li key={item.label} className="text-xs text-amber-800 flex items-center gap-1.5">
                  <span>·</span>
                  {item.href
                    ? <Link href={item.href} className="underline hover:text-amber-900">{item.label}</Link>
                    : item.label}
                  <span className="text-amber-600">— complete below</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rescore */}
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Job scores</h2>
          <p className="text-sm text-muted-foreground">
            Changed your preferences? Re-score all your matches so the rankings reflect your current profile and career level.
          </p>
          <Button variant="outline" onClick={handleRescore} disabled={rescoring} className="w-full sm:w-auto">
            {rescoring ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Re-scoring… this takes a minute
              </span>
            ) : '↻ Rescore all jobs with current preferences'}
          </Button>
        </div>

        {/* Personal */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Personal</h2>
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input value={profile.full_name}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input value={profile.email} disabled className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground" />
          </div>
        </div>

        {/* Resume */}
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Resume</h2>
            {profile.has_resume && <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>}
          </div>
          <p className="text-sm text-muted-foreground">Upload a new resume to update your profile and improve your matches.</p>
          <Link href="/onboarding/upload?from=profile"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            ↑ Upload new resume
          </Link>
        </div>

        {/* Job preferences */}
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="font-semibold">Job preferences</h2>

          <div>
            <label className="text-sm font-medium block mb-1">What are you looking for?</label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map(t => {
                const selected = prefs.job_types.includes(t.value)
                return (
                  <button key={t.value} type="button"
                    onClick={() => setPrefs(p => ({
                      ...p,
                      job_types: selected ? p.job_types.filter(x => x !== t.value) : [...p.job_types, t.value],
                    }))}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      selected ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:border-foreground/40'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Career level</label>
            <div className="flex flex-wrap gap-2">
              {JOB_LEVELS.map(l => (
                <button key={l.value} type="button"
                  onClick={() => setPrefs(p => ({ ...p, job_level: l.value }))}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    prefs.job_level === l.value ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">Years in your field</label>
              <div className="flex flex-wrap gap-2">
                {YEARS_OPTIONS.map(y => (
                  <button key={y} type="button"
                    onClick={() => setPrefs(p => ({ ...p, years_in_field: y }))}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      prefs.years_in_field === y ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:border-foreground/40'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Total work experience</label>
              <div className="flex flex-wrap gap-2">
                {YEARS_OPTIONS.map(y => (
                  <button key={y} type="button"
                    onClick={() => setPrefs(p => ({ ...p, years_total: y }))}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      prefs.years_total === y ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground hover:border-foreground/40'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Management level */}
          <ChipSelect
            label="Desired role type"
            options={MANAGEMENT_LEVELS}
            value={prefs.management_level}
            onChange={v => setPrefs(p => ({ ...p, management_level: v }))}
          />

          {/* Career direction */}
          <div>
            <label className="text-sm font-medium block mb-1">Career direction <span className="font-normal text-muted-foreground">(optional)</span></label>
            <p className="text-xs text-muted-foreground mb-1.5">Switching fields or pivoting? Describe where you want to go.</p>
            <textarea
              value={prefs.career_direction}
              onChange={e => setPrefs(p => ({ ...p, career_direction: e.target.value }))}
              placeholder="e.g. Transitioning from marketing analytics to data engineering. Strong Excel + SQL foundation, targeting BI/data roles."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <TagInput label="Job titles you're targeting" values={prefs.job_titles}
            onChange={v => setPrefs(p => ({ ...p, job_titles: v }))} placeholder="e.g. Data Analyst" />

          <div>
            <label className="text-sm font-medium block mb-1">Preferred location</label>
            <input value={prefs.location} onChange={e => setPrefs(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Amsterdam"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Search radius: {prefs.radius_km} km</label>
            <input type="range" min={10} max={100} step={10} value={prefs.radius_km}
              onChange={e => setPrefs(p => ({ ...p, radius_km: Number(e.target.value) }))}
              className="w-full accent-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>10 km</span><span>100 km</span></div>
          </div>

          {/* Work arrangement */}
          <MultiChipSelect
            label="Work arrangement"
            options={WORK_ARRANGEMENTS}
            value={prefs.work_arrangement}
            onChange={v => setPrefs(p => ({ ...p, work_arrangement: v }))}
          />

          {/* Salary */}
          <div>
            <label className="text-sm font-medium block mb-1">Salary expectations <span className="font-normal text-muted-foreground">(annual gross €)</span></label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <input
                    type="number"
                    value={prefs.salary_min ?? ''}
                    onChange={e => setPrefs(p => ({ ...p, salary_min: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="40,000"
                    className="w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Minimum</p>
              </div>
              <span className="text-muted-foreground text-sm pb-4">–</span>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <input
                    type="number"
                    value={prefs.salary_max ?? ''}
                    onChange={e => setPrefs(p => ({ ...p, salary_max: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="70,000"
                    className="w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum</p>
              </div>
            </div>
          </div>

          {/* Dutch proficiency */}
          <ChipSelect
            label="Dutch language proficiency"
            options={DUTCH_PROFICIENCY_OPTIONS}
            value={prefs.dutch_proficiency}
            onChange={v => setPrefs(p => ({ ...p, dutch_proficiency: v }))}
          />

          {/* Company size */}
          <MultiChipSelect
            label="Company size preference"
            options={COMPANY_SIZES}
            value={prefs.company_size}
            onChange={v => setPrefs(p => ({ ...p, company_size: v }))}
          />

          <TagInput label="Example companies you'd love to work at" values={prefs.example_companies}
            onChange={v => setPrefs(p => ({ ...p, example_companies: v }))} placeholder="e.g. McKinsey" />

          <TagInput label="Sector preferences" values={prefs.sector_preferences}
            onChange={v => setPrefs(p => ({ ...p, sector_preferences: v }))} placeholder="e.g. Consulting" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>

        {/* Account deletion */}
        <div className="pt-2 border-t">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-muted-foreground hover:text-red-600 underline underline-offset-2 transition-colors"
            >
              Delete account
            </button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-red-800">Delete your account?</p>
              <p className="text-xs text-red-700">This permanently removes all your data — matches, applications, resume, cover letters. Cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete everything'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
