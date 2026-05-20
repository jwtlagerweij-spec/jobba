'use client'

import { useState } from 'react'

/**
 * Build a list of domain candidates to try in order.
 * For "Yellowtail Conclusion" this yields:
 *   yellowtailconclusion.nl → yellowtail.nl → conclusion.nl → yellowtailconclusion.com → yellowtail.com
 * then falls back to Google favicons, then coloured initials.
 */
function buildDomainCandidates(company: string): string[] {
  const strip = (s: string) =>
    s.toLowerCase()
      .replace(/\s+(b\.v\.|bv|n\.v\.|nv|inc\.|ltd\.|group|holding|nederland|netherlands|amsterdam|rotterdam|utrecht|international|europe|solutions|services|consultancy|consulting)$/i, '')
      .trim()
      .replace(/[^a-z0-9]/g, '')

  const words = company.trim().split(/\s+/)
  const full = strip(company)
  const first = strip(words[0])
  const last = strip(words[words.length - 1])

  const candidates: string[] = []
  const seen = new Set<string>()
  const add = (d: string) => { if (d && !seen.has(d)) { seen.add(d); candidates.push(d) } }

  // Try .nl first (Dutch companies), then .com
  for (const tld of ['.nl', '.com']) {
    add(full + tld)
    if (first !== full) add(first + tld)
    if (last !== full && last !== first) add(last + tld)
  }

  return candidates
}

function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
]

function pickGradient(name: string): string {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return GRADIENTS[hash % GRADIENTS.length]
}

export function CompanyLogo({ company, size = 40 }: { company: string; size?: number }) {
  const candidates = buildDomainCandidates(company)
  // stages: clearbit candidates, then google favicon, then initials
  const [idx, setIdx] = useState(0)
  const [useFavicon, setUseFavicon] = useState(false)
  const [failed, setFailed] = useState(false)

  const initials = getInitials(company)
  const gradient = pickGradient(company)
  const fontSize = size * 0.32

  function handleError() {
    if (!useFavicon && idx < candidates.length - 1) {
      // Try next clearbit candidate
      setIdx(i => i + 1)
    } else if (!useFavicon) {
      // All clearbit attempts failed — try Google favicon
      setUseFavicon(true)
    } else {
      // Google favicon also failed — show initials
      setFailed(true)
    }
  }

  if (failed) {
    return (
      <div
        style={{ width: size, height: size, fontSize }}
        className={`rounded-xl flex items-center justify-center font-bold shrink-0 text-white bg-gradient-to-br ${gradient} shadow-sm`}
      >
        {initials}
      </div>
    )
  }

  const src = useFavicon
    ? `https://www.google.com/s2/favicons?domain=${candidates[0]}&sz=128`
    : `https://logo.clearbit.com/${candidates[idx]}`

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl border bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={company}
        style={{ width: size - 10, height: size - 10, objectFit: 'contain' }}
        onError={handleError}
      />
    </div>
  )
}
