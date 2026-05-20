'use client'

import { useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const JOB_TYPES = [
  { value: 'job',          label: 'Job',          description: 'Full-time or part-time positions' },
  { value: 'internship',   label: 'Internship',   description: 'Stage / Stagiair' },
  { value: 'traineeship',  label: 'Traineeship',  description: 'Graduate or trainee programmes' },
  { value: 'any',          label: 'All types',    description: 'Show me everything' },
]

const JOB_LEVELS = [
  { value: 'student',  label: 'Student',          description: "I'm still studying" },
  { value: 'graduate', label: 'Recent graduate',  description: "I graduated in the past 2 years" },
  { value: 'junior',   label: 'Junior',           description: '0–2 years in my field' },
  { value: 'medior',   label: 'Medior',           description: '3–5 years of experience' },
  { value: 'senior',   label: 'Senior',           description: '6–10 years of experience' },
  { value: 'lead',     label: 'Lead / Principal', description: '10+ years, people leadership' },
]

const YEARS_OPTIONS = ['0-2', '3-5', '6-10', '10+']

const WORK_ARRANGEMENTS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const COMPANY_SIZES = [
  { value: 'startup',       label: 'Startup',       description: '< 50 people' },
  { value: 'scaleup',       label: 'Scale-up',      description: '50–500 people' },
  { value: 'sme',           label: 'SME',            description: 'Midsize company' },
  { value: 'corporate',     label: 'Large corporate', description: '1000+ people' },
  { value: 'multinational', label: 'Multinational',  description: 'Global enterprise' },
]

const DUTCH_PROFICIENCY_OPTIONS = [
  { value: 'native',  label: 'Native',       description: 'Dutch is my first language' },
  { value: 'fluent',  label: 'Fluent',       description: 'C1/C2 — professional level' },
  { value: 'basic',   label: 'Basic',        description: 'A1–B1 — limited Dutch' },
  { value: 'none',    label: 'No Dutch',     description: 'I do not speak Dutch' },
]

const MANAGEMENT_LEVELS = [
  { value: 'ic',        label: 'Individual contributor', description: 'No direct reports' },
  { value: 'lead',      label: 'Team / tech lead',       description: 'Leading a small team or workstream' },
  { value: 'manager',   label: 'Manager / Head of',      description: 'Managing a team' },
  { value: 'director',  label: 'Director / VP',          description: 'Leading a department' },
  { value: 'executive', label: 'C-level / Board',        description: 'Exec or board-level role' },
]

// Top-level sectors with optional sub-options
const SECTOR_OPTIONS: { label: string; subs?: string[] }[] = [
  { label: 'Consulting' },
  { label: 'Data & Analytics' },
  { label: 'AI & Tech' },
  { label: 'FinTech' },
  { label: 'Strategy' },
  { label: 'Marketing' },
  { label: 'Finance' },
  {
    label: 'Education',
    subs: [
      'Primary school (Basisonderwijs)',
      'Secondary — VMBO/MAVO',
      'Secondary — HAVO/VWO',
      'Vocational (MBO)',
      'Higher professional (HBO)',
      'University (WO)',
      'Special needs education',
    ],
  },
  {
    label: 'Healthcare',
    subs: [
      'Hospital (Ziekenhuis)',
      'General practice (Huisarts)',
      'Mental health (GGZ)',
      'Elderly care (Verpleging)',
      'Home care (Thuiszorg)',
      'Medical research',
    ],
  },
  {
    label: 'Government & Public Sector',
    subs: [
      'Municipality (Gemeente)',
      'National Government (Rijk)',
      'Province (Provincie)',
      'Water Board (Waterschap)',
      'Semi-public / Quango',
    ],
  },
  { label: 'Legal' },
  {
    label: 'Logistics & Supply Chain',
    subs: ['Transport', 'Warehousing & Fulfilment', 'Procurement', 'Port & Shipping'],
  },
  { label: 'Energy & Sustainability' },
  { label: 'Media & Creative' },
  { label: 'Real Estate' },
  { label: 'Non-profit & NGO' },
  { label: 'Retail & E-commerce' },
  { label: 'HR & Recruitment' },
]

export default function PreferencesPage() {
  const router = useRouter()

  const [jobTypes, setJobTypes] = useState<string[]>(['job'])
  const [jobLevel, setJobLevel] = useState('graduate')
  const [yearsInField, setYearsInField] = useState('0-2')
  const [jobTitles, setJobTitles] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [workArrangement, setWorkArrangement] = useState<string[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [sectors, setSectors] = useState<string[]>([])
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [companySize, setCompanySize] = useState<string[]>([])
  const [careerDirection, setCareerDirection] = useState('')
  const [dutchProficiency, setDutchProficiency] = useState('')
  const [managementLevel, setManagementLevel] = useState('')
  const [saving, setSaving] = useState(false)

  function addTag(e: KeyboardEvent<HTMLInputElement>, list: string[], setList: (v: string[]) => void) {
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

  function toggleSector(s: string) {
    setSectors(prev => {
      const next = prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
      const sectorDef = SECTOR_OPTIONS.find(opt => opt.label === s)
      if (prev.includes(s) && sectorDef?.subs) {
        return next.filter(x => !sectorDef.subs!.includes(x))
      }
      return next
    })
  }

  function toggle<T extends string>(val: T, list: T[], setList: (v: T[]) => void) {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_types: jobTypes,
          job_level: jobLevel,
          years_in_field: yearsInField,
          job_titles: jobTitles,
          location: location || null,
          work_arrangement: workArrangement.length > 0 ? workArrangement : null,
          example_companies: companies,
          sector_preferences: sectors,
          salary_min: salaryMin ? parseInt(salaryMin) : null,
          salary_max: salaryMax ? parseInt(salaryMax) : null,
          company_size: companySize.length > 0 ? companySize : null,
          career_direction: careerDirection.trim() || null,
          dutch_proficiency: dutchProficiency || null,
          management_level: managementLevel || null,
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

  const allKnownSectors = SECTOR_OPTIONS.flatMap(s => [s.label, ...(s.subs ?? [])])
  const customSectors = sectors.filter(s => !allKnownSectors.includes(s))

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

          {/* What are you looking for */}
          <div>
            <label className="block text-sm font-medium mb-1">What are you looking for?</label>
            <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
            <div className="grid grid-cols-2 gap-2">
              {JOB_TYPES.map(t => {
                const selected = jobTypes.includes(t.value)
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setJobTypes(prev =>
                      selected ? prev.filter(x => x !== t.value) : [...prev, t.value]
                    )}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? 'border-foreground bg-foreground/5'
                        : 'border-input hover:border-foreground/40'
                    }`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Career level */}
          <div>
            <label className="block text-sm font-medium mb-2">Where are you in your career?</label>
            <div className="flex flex-col gap-2">
              {JOB_LEVELS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setJobLevel(l.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    jobLevel === l.value
                      ? 'border-foreground bg-foreground/5'
                      : 'border-input hover:border-foreground/40'
                  }`}
                >
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className="text-xs text-muted-foreground">{l.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Years in field */}
          <div>
            <label className="block text-sm font-medium mb-2">Years of experience in your field</label>
            <div className="flex gap-2 flex-wrap">
              {YEARS_OPTIONS.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYearsInField(y)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    yearsInField === y
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-input text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {y} {y === '10+' ? 'years' : 'yrs'}
                </button>
              ))}
            </div>
          </div>

          {/* Management level — show for non-student/graduate */}
          {(jobLevel === 'medior' || jobLevel === 'senior' || jobLevel === 'lead') && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Desired role type <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">Are you looking to manage people or stay individual contributor?</p>
              <div className="flex flex-col gap-2">
                {MANAGEMENT_LEVELS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setManagementLevel(managementLevel === m.value ? '' : m.value)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      managementLevel === m.value
                        ? 'border-foreground bg-foreground/5'
                        : 'border-input hover:border-foreground/40'
                    }`}
                  >
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Career direction — for career switchers */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Career direction <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Switching fields or pivoting? Tell us where you want to go — not just where you&apos;ve been.
            </p>
            <textarea
              value={careerDirection}
              onChange={e => setCareerDirection(e.target.value)}
              placeholder="e.g. Transitioning from marketing to data analytics. I have strong Excel skills and want to move into SQL and BI roles."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Job titles */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Job titles you&apos;re targeting <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              These drive your daily job search. We already generated suggestions from your CV — add or override them here.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {jobTitles.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs">
                  {t}
                  <button onClick={() => setJobTitles(jobTitles.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g. Data Analyst — press Enter to add"
              onKeyDown={e => addTag(e, jobTitles, setJobTitles)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Location */}
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

          {/* Work arrangement */}
          <div>
            <label className="block text-sm font-medium mb-2">Work arrangement</label>
            <div className="flex gap-2">
              {WORK_ARRANGEMENTS.map(w => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => toggle(w.value, workArrangement, setWorkArrangement)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                    workArrangement.includes(w.value)
                      ? 'border-foreground bg-foreground/5'
                      : 'border-input hover:border-foreground/40 text-muted-foreground'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Salary expectations */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Salary expectations <span className="text-muted-foreground font-normal">(optional, annual gross €)</span>
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={e => setSalaryMin(e.target.value)}
                    placeholder="40,000"
                    min={0}
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
                    value={salaryMax}
                    onChange={e => setSalaryMax(e.target.value)}
                    placeholder="70,000"
                    min={0}
                    className="w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum</p>
              </div>
            </div>
          </div>

          {/* Dutch proficiency */}
          <div>
            <label className="block text-sm font-medium mb-1">Dutch language proficiency</label>
            <p className="text-xs text-muted-foreground mb-2">Most Dutch jobs require Dutch. This filters out roles you can&apos;t realistically apply for.</p>
            <div className="grid grid-cols-2 gap-2">
              {DUTCH_PROFICIENCY_OPTIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDutchProficiency(dutchProficiency === d.value ? '' : d.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    dutchProficiency === d.value
                      ? 'border-foreground bg-foreground/5'
                      : 'border-input hover:border-foreground/40'
                  }`}
                >
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Company size */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Company size preference <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex flex-col gap-2">
              {COMPANY_SIZES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggle(s.value, companySize, setCompanySize)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    companySize.includes(s.value)
                      ? 'border-foreground bg-foreground/5'
                      : 'border-input hover:border-foreground/40'
                  }`}
                >
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Example companies */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Dream companies <span className="text-muted-foreground font-normal">(optional)</span>
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

          {/* Sectors */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Preferred sectors <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <p className="text-xs text-muted-foreground mb-3">Select a sector to see more specific options</p>

            <div className="space-y-3">
              {SECTOR_OPTIONS.map(opt => {
                const isSelected = sectors.includes(opt.label)
                const hasActiveSubs = opt.subs?.some(s => sectors.includes(s))
                const showSubs = isSelected && opt.subs && opt.subs.length > 0

                return (
                  <div key={opt.label}>
                    <button
                      type="button"
                      onClick={() => toggleSector(opt.label)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isSelected || hasActiveSubs
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-foreground hover:border-foreground/60'
                      }`}
                    >
                      {opt.label}
                      {opt.subs ? ` ▾` : ''}
                    </button>

                    {showSubs && (
                      <div className="mt-2 ml-3 pl-3 border-l-2 border-primary/20 flex flex-wrap gap-2">
                        {opt.subs!.map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSectors(prev =>
                              prev.includes(sub) ? prev.filter(x => x !== sub) : [...prev, sub]
                            )}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              sectors.includes(sub)
                                ? 'bg-primary/15 text-primary border-primary/40'
                                : 'bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {customSectors.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-foreground text-background border-foreground px-3 py-1.5 text-xs font-medium">
                  {s}
                  <button type="button" onClick={() => setSectors(prev => prev.filter(x => x !== s))} className="hover:opacity-70">×</button>
                </span>
              ))}
            </div>

            <input
              type="text"
              placeholder="Add a custom sector + press Enter"
              onKeyDown={e => addTag(e, sectors, setSectors)}
              className="w-full mt-3 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save and find my matches'}
          </Button>
          <Button variant="ghost" onClick={() => router.push('/onboarding/done')} className="w-full text-muted-foreground">
            Skip for now
          </Button>
        </div>
      </div>
    </main>
  )
}
