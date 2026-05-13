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
import { CompanyLogo } from '@/components/ui/company-logo'

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
  { id: 'saved',        label: 'Saved',        color: 'border-t-slate-400' },
  { id: 'applied',      label: 'Applied',       color: 'border-t-blue-400' },
  { id: 'interviewing', label: 'Interviewing',  color: 'border-t-purple-400' },
  { id: 'offered',      label: 'Offered',       color: 'border-t-green-400' },
  { id: 'rejected',     label: 'Rejected',      color: 'border-t-red-400' },
]

function JobCard({ app, isDragging }: { app: Application; isDragging?: boolean }) {
  const job = app.jobs
  return (
    <div className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow ${isDragging ? 'shadow-lg opacity-90' : 'hover:shadow-md'}`}>
      <div className="flex items-start gap-2">
        <CompanyLogo company={job?.company ?? 'Company'} size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug truncate">{job?.title ?? 'Unknown role'}</p>
          <p className="text-xs text-muted-foreground truncate">{job?.company ?? '—'}</p>
          {job?.location && <p className="text-xs text-muted-foreground">{job.location}</p>}
        </div>
      </div>
      {job?.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="mt-2 block text-xs text-muted-foreground underline hover:text-foreground"
        >
          View posting →
        </a>
      )}
    </div>
  )
}

function SortableCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <JobCard app={app} />
    </div>
  )
}

function Column({ column, apps }: { column: typeof COLUMNS[0]; apps: Application[] }) {
  return (
    <div className={`rounded-xl border border-t-4 bg-muted/30 p-3 min-h-[200px] flex flex-col gap-2 ${column.color}`}>
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-sm font-semibold">{column.label}</span>
        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 border">
          {apps.length}
        </span>
      </div>
      <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
        {apps.map(app => <SortableCard key={app.id} app={app} />)}
      </SortableContext>
      {apps.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">Drop here</p>
      )}
    </div>
  )
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeApp, setActiveApp] = useState<Application | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetch('/api/applications')
      .then(r => r.json())
      .then(data => setApplications(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

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

    // Determine target column: over could be a column id or a card id
    const targetColumn = COLUMNS.find(c => c.id === over.id)
      ?? COLUMNS.find(c => c.id === applications.find(a => a.id === over.id)?.status)

    if (!targetColumn || targetColumn.id === draggedApp.status) return

    setApplications(prev =>
      prev.map(a => a.id === draggedApp.id ? { ...a, status: targetColumn.id } : a)
    )

    fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: draggedApp.job_id, status: targetColumn.id }),
    })
  }

  const byStatus = (status: string) => applications.filter(a => a.status === status)

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">Jobba</span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
          <Link href="/coach" className="text-muted-foreground hover:text-foreground">Coach</Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground">Profile</Link>
        </div>
      </nav>

      <main className="px-4 py-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Applications</h1>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {COLUMNS.map(c => (
              <div key={c.id} className="rounded-xl border border-t-4 bg-muted/30 p-3 h-48 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && applications.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <p className="text-2xl mb-3">📋</p>
            <h2 className="font-semibold mb-1">No applications yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Use the status dropdown on job cards in your dashboard to start tracking.
            </p>
            <Link href="/dashboard" className="text-sm underline text-muted-foreground hover:text-foreground">
              Go to dashboard →
            </Link>
          </div>
        )}

        {!loading && applications.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {COLUMNS.map(col => (
                <Column key={col.id} column={col} apps={byStatus(col.id)} />
              ))}
            </div>
            <DragOverlay>
              {activeApp && <JobCard app={activeApp} isDragging />}
            </DragOverlay>
          </DndContext>
        )}
      </main>
    </div>
  )
}
