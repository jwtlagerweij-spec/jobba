'use client'

import { useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function PreferencesPage() {
  const router = useRouter()

  const [location, setLocation] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [sectors, setSectors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function addTag(
    e: KeyboardEvent<HTMLInputElement>,
    list: string[],
    setList: (v: string[]) => void
  ) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = (e.target as HTMLInputElement).value.trim().replace(/,$/, '')
      if (val && !list.includes(val)) {
        setList([...list, val])
        ;(e.target as HTMLInputElement).value = ''
      }
    }
  }

  function removeTag(list: string[], setList: (v: string[]) => void, i: number) {
    setList(list.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location || null,
          remote_only: remoteOnly,
          example_companies: companies,
          sector_preferences: sectors,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save.')
        return
      }
      router.push('/onboarding/done')
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const sectorOptions = ['Consulting', 'Data & Analytics', 'AI & Tech', 'FinTech', 'Strategy', 'Marketing', 'Finance', 'Healthcare']

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Sharpen your results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All optional — skip anything that doesn&apos;t apply. These improve your daily matches.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Amsterdam, Rotterdam, Utrecht"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={e => setRemoteOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
            <span className="text-sm">Remote only</span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">
              Example companies{' '}
              <span className="text-muted-foreground font-normal">(companies you&apos;d love to work at)</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">Type a name and press Enter</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {companies.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs">
                  {c}
                  <button onClick={() => removeTag(companies, setCompanies, i)} className="text-muted-foreground hover:text-foreground">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="McKinsey, KPMG, Picnic…"
              onKeyDown={e => addTag(e, companies, setCompanies)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preferred sectors</label>
            <div className="flex flex-wrap gap-2">
              {sectorOptions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setSectors(prev =>
                      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    sectors.includes(s)
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-foreground hover:border-foreground/60'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save and find my matches'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/onboarding/done')}
            className="w-full text-muted-foreground"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </main>
  )
}
