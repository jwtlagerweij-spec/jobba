'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'

interface Profile {
  full_name: string
  email: string
  ai_credits_remaining: number
}

interface Prefs {
  job_titles: string[]
  location: string
  radius_km: number
  remote_only: boolean
  example_companies: string[]
  sector_preferences: string[]
}

function TagInput({ label, values, onChange, placeholder }: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
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
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>({ full_name: '', email: '', ai_credits_remaining: 0 })
  const [prefs, setPrefs] = useState<Prefs>({
    job_titles: [], location: '', radius_km: 50,
    remote_only: false, example_companies: [], sector_preferences: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, ai_credits_remaining').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setProfile({ full_name: data.full_name ?? '', email: user.email ?? '', ai_credits_remaining: data.ai_credits_remaining ?? 0 })
        })
    })

    fetch('/api/preferences')
      .then(r => r.json())
      .then(data => {
        setPrefs({
          job_titles: data.job_titles ?? [],
          location: data.location ?? '',
          radius_km: data.radius_km ?? 50,
          remote_only: data.remote_only ?? false,
          example_companies: data.example_companies ?? [],
          sector_preferences: data.sector_preferences ?? [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user.id)

      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error('Failed to save preferences')

      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save. Try again.')
    }
    setSaving(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">Jobba</span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
          <Link href="/applications" className="text-muted-foreground hover:text-foreground">Applications</Link>
          <Link href="/coach" className="text-muted-foreground hover:text-foreground">Coach</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <span className="text-xs text-muted-foreground">{profile.ai_credits_remaining} AI credit{profile.ai_credits_remaining !== 1 ? 's' : ''} remaining</span>
        </div>

        {/* Personal */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Personal</h2>
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input
              value={profile.full_name}
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
          <h2 className="font-semibold">Resume</h2>
          <p className="text-sm text-muted-foreground">Upload a new resume to update your profile and job matches.</p>
          <Link
            href="/onboarding/upload?from=profile"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            ↑ Upload new resume
          </Link>
        </div>

        {/* Job preferences */}
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="font-semibold">Job preferences</h2>

          <TagInput
            label="Job titles you're targeting"
            values={prefs.job_titles}
            onChange={v => setPrefs(p => ({ ...p, job_titles: v }))}
            placeholder="e.g. Data Analyst"
          />

          <div>
            <label className="text-sm font-medium block mb-1">Preferred location</label>
            <input
              value={prefs.location}
              onChange={e => setPrefs(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Amsterdam"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Search radius: {prefs.radius_km} km</label>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={prefs.radius_km}
              onChange={e => setPrefs(p => ({ ...p, radius_km: Number(e.target.value) }))}
              className="w-full accent-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>10 km</span><span>100 km</span>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.remote_only}
              onChange={e => setPrefs(p => ({ ...p, remote_only: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Remote only</span>
          </label>

          <TagInput
            label="Example companies you'd love to work at"
            values={prefs.example_companies}
            onChange={v => setPrefs(p => ({ ...p, example_companies: v }))}
            placeholder="e.g. McKinsey"
          />

          <TagInput
            label="Sector preferences"
            values={prefs.sector_preferences}
            onChange={v => setPrefs(p => ({ ...p, sector_preferences: v }))}
            placeholder="e.g. Consulting"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Sign out
          </button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </main>
    </div>
  )
}
