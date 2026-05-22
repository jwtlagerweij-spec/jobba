'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LayoutGrid, List } from 'lucide-react'
import { CompanyLogo } from '@/components/ui/company-logo'
import { AppNav } from '@/components/ui/app-nav'

interface Application {
  id: string
  job_id: string
  status: string
  notes: string | null
  applied_at: string | null
  updated_at: string
  jobs: {
    title: string
    company: string | null
    location: string | null
    url: string
  } | null
}

const COLUMNS = [
  { id: 'saved', label: 'Saved', color: 'border-t-slate-400', dot: 'bg-slate-400' },
  { id: 'applied', label: 'Applied', color: 'border-t-blue-400', dot: 'bg-blue-400' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-t-violet-500', dot: 'bg-violet-500' },
  { id: 'offered', label: 'Offered', color: 'border-t-green-500', dot: 'bg-green-500' },
  { id: 'rejected', label: 'Rejected', color: 'border-t-red-400', dot: 'bg-red-400' },
]

const STATUS_BADGE: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-700 border-slate-200',
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  interviewing: 'bg-violet-100 text-violet-700 border-violet-200',
  offered: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-NL', { day: 'numeric', month: 'short' })
}

function KanbanCard({ app, isDragging }: { app: Application; isDragging?: boolean }) {
  const job = app.jobs
  return (
    <div
      className={`rounded-lg border bg-card p-3 transition-all ${
        isDragging ? 'shadow-lg opacity-90 rotate-1' : 'shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <CompanyLogo company={job?.company ?? 'Company'} size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug truncate">{job?.title ?? 'Unknown role'}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{job?.company ?? '—'}</p>
        </div>
      </div>
      {app.applied_at && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          Applied {formatDate(app.applied_at)}
        </p>
      )}
      {job?.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="mt-1.5 block text-xs text-primary hover:opacity-75 transition-opacity"
        >
          View posting →
        </a>
      )}
    </div>
  )
}

function SortableCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <KanbanCard app={app} />
    </div>
  )
}

function KanbanColumn({ column, apps }: { column: (typeof COLUMNS)[0]; apps: Application[] }) {
  return (
    <div
      className={`rounded-xl border border-t-4 bg-muted/20 p-3 min-h-[200px] flex flex-col gap-2 ${column.color}`}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${column.dot}`} />
          <span className="text-sm font-semibold">{column.label}</span>
        </div>
        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 border">
          {apps.length}
        </span>
      </div>
      <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
        {apps.map(app => (
          <SortableCard key={app.id} app={app} />
        ))}
      </SortableContext>
      {apps.length === 0 && (
        <p className="text-xs text-muted-foreground/60 text-center py-8">Empty</p>
      )}
    </div>
  )
}

function ListRow({ app, onStatusChange }: { app: Application; onStatusChange: (id: string, status: string) => void }) {
  const job = app.jobs
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border hover:border-foreground/20 hover:shadow-sm transition-all">
      <CompanyLogo company={job?.company ?? 'Company'} size={40} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{job?.title ?? 'Unknown role'}</p>
        <p className="text-xs text-muted-foreground truncate">{job?.company ?? '—'} {job?.location ? `· ${job.location}` : ''}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {app.applied_at && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {formatDate(app.applied_at)}
          </span>
        )}
        <select
          value={app.status}
          onChange={e => onStatusChange(app.id, e.target.value)}
          aria-label="Application status"
          className={`text-xs rounded-full border px-2.5 py-1 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${STATUS_BADGE[app.status] ?? 'bg-muted text-muted-foreground'}`}
        >
          {COLUMNS.map(c => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {job?.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden md:block"
            aria-label="View job posting"
          >
            →
          </a>
        )}
      </div>
    </div>
  )
}

type ViewMode = 'kanban' | 'list'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeApp, setActiveApp] = useState<Application | null>(null)
  const [view, setView] = useState<ViewMode>('kanban')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    const saved = typeof window !== 'undefined'
      ? (localStorage.getItem('applications-view') as ViewMode | null)
      : null
    if (saved === 'list' || saved === 'kanban') setView(saved)

    fetch('/api/applications')
      .then(r => r.json())
      .then(data => setApplications(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  function handleViewChange(v: ViewMode) {
    setView(v)
    localStorage.setItem('applications-view', v)
  }

  function handleDragStart(event: DragStartEvent) {
    const app = applications.find(a => a.id === event.active.id)
    setActiveApp(app ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null)
    const { active, over } = event
    if (!over) return

    const draggedApp = applications.find(a => a.id === active.id)
    if (!draggedApp) return

    const targetColumn =
      COLUMNS.find(c => c.id === over.id) ??
      COLUMNS.find(c => c.id === applications.find(a => a.id === over.id)?.status)

    if (!targetColumn || targetColumn.id === draggedApp.status) return

    setApplications(prev =>
      prev.map(a => (a.id === draggedApp.id ? { ...a, status: targetColumn.id } : a))
    )

    fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: draggedApp.job_id, status: targetColumn.id }),
    })
  }

  function handleListStatusChange(appId: string, newStatus: string) {
    const app = applications.find(a => a.id === appId)
    if (!app || app.status === newStatus) return
    setApplications(prev => prev.map(a => (a.id === appId ? { ...a, status: newStatus } : a)))
    fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: app.job_id, status: newStatus }),
    })
  }

  const byStatus = (status: string) => applications.filter(a => a.status === status)

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === 'applied').length,
    interviewing: applications.filter(a => a.status === 'interviewing').length,
    offered: applications.filter(a => a.status === 'offered').length,
  }
  const responded =
    stats.applied + stats.interviewing + stats.offered +
    applications.filter(a => a.status === 'rejected').length
  const responseRate =
    stats.applied > 0
      ? Math.round(((stats.interviewing + stats.offered) / responded) * 100)
      : null

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="px-4 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Applications</h1>
          {applications.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
              <button
                onClick={() => handleViewChange('kanban')}
                aria-label="Kanban view"
                className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => handleViewChange('list')}
                aria-label="List view"
                className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {!loading && applications.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total tracked', value: String(stats.total), color: 'text-foreground' },
              { label: 'Applied', value: String(stats.applied), color: 'text-blue-600' },
              { label: 'Interviewing', value: String(stats.interviewing), color: 'text-violet-600' },
              {
                label: 'Response rate',
                value: responseRate !== null ? `${responseRate}%` : '—',
                color: responseRate !== null && responseRate > 0 ? 'text-green-600' : 'text-muted-foreground',
              },
            ].map(s => (
              <div key={s.label} className="rounded-xl border bg-card p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {COLUMNS.map(c => (
              <div
                key={c.id}
                className="rounded-xl border border-t-4 bg-muted/20 p-3 h-48 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && applications.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <h2 className="font-semibold mb-1">No applications yet</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Save a job or mark one as applied from the matches page to start tracking here.
            </p>
            <Link
              href="/matches"
              className="text-sm text-primary font-medium hover:opacity-75 transition-opacity"
            >
              Go to your matches →
            </Link>
          </div>
        )}

        {/* Kanban view */}
        {!loading && applications.length > 0 && view === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {COLUMNS.map(col => (
                <KanbanColumn key={col.id} column={col} apps={byStatus(col.id)} />
              ))}
            </div>
            <DragOverlay>
              {activeApp && <KanbanCard app={activeApp} isDragging />}
            </DragOverlay>
          </DndContext>
        )}

        {/* List view */}
        {!loading && applications.length > 0 && view === 'list' && (
          <div className="space-y-2">
            {applications.map(app => (
              <ListRow key={app.id} app={app} onStatusChange={handleListStatusChange} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
