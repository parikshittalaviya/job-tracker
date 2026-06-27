'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, ALL_STATUSES, statusLabel } from './status-badge'
import type { JobApplication, AppStatus, WorkType } from '@/types/database'

type SortOption = 'newest' | 'oldest' | 'deadline' | 'status'
type H1Filter = 'all' | 'yes' | 'no' | 'unknown'

const STATUS_ORDER: Record<AppStatus, number> = {
  saved: 0, applied: 1, phone_screen: 2, technical: 3,
  onsite: 4, offer: 5, accepted: 6, rejected: 7,
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatSalary(app: JobApplication) {
  if (!app.salary_min && !app.salary_max) return '—'
  const fmt = (n: number) =>
    n >= 1000 ? `${app.salary_currency ?? 'USD'} ${Math.round(n / 1000)}k` : `${app.salary_currency ?? 'USD'} ${n}`
  if (app.salary_min && app.salary_max) return `${fmt(app.salary_min)} – ${fmt(app.salary_max)}`
  return fmt(app.salary_min ?? app.salary_max ?? 0)
}

export function ApplicationTable({ initialApps }: { initialApps: JobApplication[] }) {
  const router = useRouter()
  const [apps, setApps] = useState(initialApps)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppStatus | 'all'>('all')
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkType | 'all'>('all')
  const [h1Filter, setH1Filter] = useState<H1Filter>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = apps
    .filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (workTypeFilter !== 'all' && a.work_type !== workTypeFilter) return false
      if (h1Filter === 'yes' && a.h1_sponsor !== true) return false
      if (h1Filter === 'no' && a.h1_sponsor !== false) return false
      if (h1Filter === 'unknown' && a.h1_sponsor !== null) return false
      const q = search.toLowerCase()
      if (q && !a.company?.toLowerCase().includes(q) && !a.role?.toLowerCase().includes(q) && !a.location?.toLowerCase().includes(q)) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'deadline') {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      if (sort === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  async function handleDelete(id: string) {
    if (!confirm('Delete this application? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== id))
      toast.success('Application deleted')
    } else {
      toast.error('Failed to delete')
    }
    setDeleting(null)
  }

  const hasActiveFilters = statusFilter !== 'all' || workTypeFilter !== 'all' || h1Filter !== 'all' || search

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search company, role, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={workTypeFilter} onValueChange={(v) => setWorkTypeFilter(v as WorkType | 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Work type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="onsite">Onsite</SelectItem>
          </SelectContent>
        </Select>
        <Select value={h1Filter} onValueChange={(v) => setH1Filter(v as H1Filter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="H1B sponsor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All H1B</SelectItem>
            <SelectItem value="yes">Sponsors H1B</SelectItem>
            <SelectItem value="no">No sponsorship</SelectItem>
            <SelectItem value="unknown">Sponsorship unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="deadline">Deadline soonest</SelectItem>
            <SelectItem value="status">By status</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter('all'); setWorkTypeFilter('all'); setH1Filter('all') }}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground text-sm">
          {apps.length === 0
            ? 'No applications yet. Click "Add Application" to get started.'
            : 'No applications match your filters.'}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden lg:table-cell">Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Added</TableHead>
                <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/applications/${app.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {app.company ?? <span className="text-muted-foreground italic">Unknown</span>}
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{app.role ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      {app.location ?? '—'}
                      {app.work_type && (
                        <Badge variant="outline" className="text-xs capitalize">{app.work_type}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{formatSalary(app)}</TableCell>
                  <TableCell><StatusBadge status={app.status} /></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(app.created_at)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {app.deadline ? (
                      <span className={new Date(app.deadline) < new Date() ? 'text-red-500' : ''}>
                        {formatDate(app.deadline)}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <Link href={`/applications/${app.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deleting === app.id}
                        onClick={() => handleDelete(app.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {apps.length} application{apps.length === 1 ? '' : 's'}
      </p>
    </div>
  )
}
