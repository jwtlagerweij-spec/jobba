'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, X, LayoutDashboard, Search, Briefcase,
  MessageSquare, User, FileText, LogOut, ChevronRight, ListChecks,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/logo'
import { useLanguage, t } from '@/lib/language-context'

interface AppNavProps {
  right?: React.ReactNode
  backHref?: string
  backLabel?: string
}

export function AppNav({ right, backHref, backLabel }: AppNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { lang, setLang, tr } = useLanguage()

  const resolvedBackLabel = backLabel ?? tr(t.common.back)

  const NAV_GROUPS = [
    {
      label: tr(t.nav.jobSearch),
      items: [
        { href: '/dashboard',    label: tr(t.nav.home),          icon: LayoutDashboard, sub: tr(t.dashboard.browseAllSub).split('—')[0].trim() },
        { href: '/matches',      label: tr(t.nav.myMatches),     icon: ListChecks,      sub: lang === 'nl' ? 'Al je gescoorde vacatures' : 'All your scored jobs' },
        { href: '/jobs',         label: tr(t.nav.browseJobs),    icon: Search,          sub: lang === 'nl' ? 'Alle beschikbare vacatures' : 'All available vacancies' },
        { href: '/applications', label: tr(t.nav.applications),  icon: Briefcase,       sub: lang === 'nl' ? 'Volg je sollicitaties' : 'Track your applications' },
        { href: '/coach',        label: tr(t.nav.aiCoach),       icon: MessageSquare,   sub: lang === 'nl' ? 'Vervolgvragen & tips' : 'Follow-up questions & tips' },
      ],
    },
    {
      label: tr(t.nav.account),
      items: [
        { href: '/profile',                        label: tr(t.nav.profile), icon: User,     sub: lang === 'nl' ? 'Voorkeuren & instellingen' : 'Preferences & settings' },
        { href: '/onboarding/upload?from=profile', label: tr(t.nav.resume),  icon: FileText, sub: lang === 'nl' ? 'Nieuw CV uploaden' : 'Upload a new resume' },
      ],
    },
  ]

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/login')
  }

  return (
    <>
      {/* Top nav bar */}
      <nav className="bg-background border-b px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </button>
          {backHref && (
            <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {resolvedBackLabel}
            </Link>
          )}
        </div>

        <Link href="/dashboard" className="absolute left-1/2 -translate-x-1/2">
          <Logo />
        </Link>

        <div className="flex items-center gap-2 text-sm">
          {right}
        </div>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-background z-40 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors group ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <Icon size={18} className={active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">{item.label}</p>
                        <p className={`text-xs mt-0.5 truncate ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {item.sub}
                        </p>
                      </div>
                      <ChevronRight size={14} className={`shrink-0 ${active ? 'text-primary-foreground/60' : 'text-muted-foreground/40'}`} />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Language toggle + Sign out */}
        <div className="border-t px-3 py-4 space-y-1">
          {/* Language switcher */}
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <span className="text-xs text-muted-foreground mr-1">{lang === 'nl' ? 'Taal' : 'Language'}:</span>
            <button
              onClick={() => setLang('en')}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                lang === 'en' ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground border-border hover:border-foreground/40'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('nl')}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                lang === 'nl' ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground border-border hover:border-foreground/40'
              }`}
            >
              NL
            </button>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">{tr(t.nav.signOut)}</span>
          </button>
        </div>
      </div>
    </>
  )
}
