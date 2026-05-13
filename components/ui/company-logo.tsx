'use client'

import { useState } from 'react'

function guessDomain(company: string): string {
  return company
    .toLowerCase()
    .replace(/\s+(b\.v\.|bv|n\.v\.|nv|inc\.|ltd\.|group|holding|nederland|netherlands|amsterdam|rotterdam|utrecht)$/i, '')
    .trim()
    .replace(/[^a-z0-9]/g, '')
    + '.com'
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function pickColor(name: string): string {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[hash % COLORS.length]
}

export function CompanyLogo({ company, size = 40 }: { company: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const domain = guessDomain(company)
  const initials = getInitials(company)
  const color = pickColor(company)

  if (failed) {
    return (
      <div
        style={{ width: size, height: size, fontSize: size * 0.35 }}
        className={`rounded-lg flex items-center justify-center font-semibold shrink-0 ${color}`}
      >
        {initials}
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg border bg-white flex items-center justify-center shrink-0 overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={company}
        style={{ width: size - 8, height: size - 8, objectFit: 'contain' }}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
