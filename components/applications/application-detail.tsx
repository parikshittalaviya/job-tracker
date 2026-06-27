'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Sparkles, Send, Trash2, Pencil, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, ALL_STATUSES, statusLabel } from './status-badge'
import type { JobApplication, ApplicationNote, AppStatus, WorkType } from '@/types/database'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm">{value ?? <span className="text-muted-foreground italic">Not specified</span>}</span>
    </div>
  )
}

function formatSalary(app: JobApplication) {
  if (!app.salary_min && !app.salary_max) return null
  const currency = app.salary_currency ?? 'USD'
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
  if (app.salary_min && app.salary_max) return `${currency} ${fmt(app.salary_min)} – ${fmt(app.salary_max)}`
  return `${currency} ${fmt(app.salary_min ?? app.salary_max ?? 0)}`
}

type EditFields = {
  company: string
  role: string
  location: string
  work_type: WorkType | ''
  salary_min: string
  salary_max: string
  salary_currency: string
  h1_sponsor: 'true' | 'false' | 'null'
  deadline: string
  requirements: string
}

function appToEditFields(app: JobApplication): EditFields {
  return {
    company: app.company ?? '',
    role: app.role ?? '',
    location: app.location ?? '',
    work_type: app.work_type ?? '',
    salary_min: app.salary_min != null ? String(app.salary_min) : '',
    salary_max: app.salary_max != null ? String(app.salary_max) : '',
    salary_currency: app.salary_currency ?? 'USD',
    h1_sponsor: app.h1_sponsor === true ? 'true' : app.h1_sponsor === false ? 'false' : 'null',
    deadline: app.deadline ?? '',
    requirements: (app.requirements ?? []).join('\n'),
  }
}

export function ApplicationDetail({
  app: initial,
  notes: initialNotes,
}: {
  app: JobApplication
  notes: ApplicationNote[]
}) {
  const router = useRouter()
  const [app, setApp] = useState(initial)
  const [notes, setNotes] = useState(initialNotes)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Edit details state
  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState<EditFields>(() => appToEditFields(initial))
  const [savingEdit, setSavingEdit] = useState(false)

  // Re-run AI state
  const [reextracting, setReextracting] = useState(false)

  // Edit JD state
  const [editingJD, setEditingJD] = useState(false)
  const [editJDText, setEditJDText] = useState(initial.job_description)
  const [savingJD, setSavingJD] = useState(false)

  function enterEditMode() {
    setEditFields(appToEditFields(app))
    setEditMode(true)
  }

  async function handleStatusChange(status: AppStatus) {
    setUpdatingStatus(true)
    const res = await fetch(`/api/applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json() as JobApplication
      setApp(updated)
      toast.success('Status updated')
    } else {
      toast.error('Failed to update status')
    }
    setUpdatingStatus(false)
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    const body = {
      company: editFields.company.trim() || null,
      role: editFields.role.trim() || null,
      location: editFields.location.trim() || null,
      work_type: editFields.work_type || null,
      salary_min: editFields.salary_min ? parseInt(editFields.salary_min, 10) : null,
      salary_max: editFields.salary_max ? parseInt(editFields.salary_max, 10) : null,
      salary_currency: editFields.salary_currency.trim() || 'USD',
      h1_sponsor:
        editFields.h1_sponsor === 'true' ? true
        : editFields.h1_sponsor === 'false' ? false
        : null,
      deadline: editFields.deadline || null,
      requirements: editFields.requirements
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    const res = await fetch(`/api/applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json() as JobApplication
      setApp(updated)
      setEditMode(false)
      toast.success('Changes saved')
    } else {
      toast.error('Failed to save changes')
    }
    setSavingEdit(false)
  }

  async function handleReextract() {
    setReextracting(true)
    const res = await fetch(`/api/applications/${app.id}/extract`, { method: 'POST' })
    const json = await res.json() as JobApplication & { error?: string }
    if (res.ok) {
      setApp(json)
      setEditFields(appToEditFields(json))
      toast.success('AI re-extraction complete')
    } else {
      toast.error(json.error ?? 'Re-extraction failed')
    }
    setReextracting(false)
  }

  async function handleSaveJD() {
    if (!editJDText.trim()) return
    setSavingJD(true)
    const res = await fetch(`/api/applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: editJDText.trim() }),
    })
    if (res.ok) {
      const updated = await res.json() as JobApplication
      setApp(updated)
      setEditingJD(false)
      toast.success('Job description updated')
    } else {
      toast.error('Failed to update job description')
    }
    setSavingJD(false)
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    const res = await fetch(`/api/applications/${app.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteText.trim() }),
    })
    if (res.ok) {
      const note = await res.json() as ApplicationNote
      setNotes((prev) => [note, ...prev])
      setNoteText('')
      toast.success('Note added')
    } else {
      toast.error('Failed to save note')
    }
    setSavingNote(false)
  }

  async function handleDeleteNote(noteId: string) {
    const res = await fetch(`/api/applications/${app.id}/notes?noteId=${noteId}`, { method: 'DELETE' })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } else {
      toast.error('Failed to delete note')
    }
  }

  async function handleDeleteApp() {
    if (!confirm('Delete this application? This cannot be undone.')) return
    const res = await fetch(`/api/applications/${app.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Application deleted')
      router.push('/applications')
    } else {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{app.company ?? 'Unknown Company'}</h1>
            {app.ai_extracted && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" /> AI extracted
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5">{app.role ?? 'Unknown Role'}</p>
          {app.url && (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              <ExternalLink className="h-3 w-3" /> View posting
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={app.status} onValueChange={(v) => handleStatusChange(v as AppStatus)} disabled={updatingStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <StatusBadge status={app.status} />
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleDeleteApp}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="notes">Notes {notes.length > 0 && `(${notes.length})`}</TabsTrigger>
          <TabsTrigger value="jd">Job Description</TabsTrigger>
        </TabsList>

        {/* Details tab */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                {editMode ? 'Edit Details' : 'Extracted Information'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleReextract}
                      disabled={reextracting}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${reextracting ? 'animate-spin' : ''}`} />
                      {reextracting ? 'Extracting…' : 'Re-run AI'}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={enterEditMode}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </>
                )}
                {editMode && (
                  <>
                    <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                      {savingEdit ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={savingEdit}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>

            {editMode ? (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Company</label>
                    <Input value={editFields.company} onChange={(e) => setEditFields((f) => ({ ...f, company: e.target.value }))} placeholder="Company name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Role</label>
                    <Input value={editFields.role} onChange={(e) => setEditFields((f) => ({ ...f, role: e.target.value }))} placeholder="Job title" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Location</label>
                    <Input value={editFields.location} onChange={(e) => setEditFields((f) => ({ ...f, location: e.target.value }))} placeholder="City, State or Remote" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Work Type</label>
                    <Select value={editFields.work_type || '__none'} onValueChange={(v) => setEditFields((f) => ({ ...f, work_type: v === '__none' ? '' : v as WorkType }))}>
                      <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not specified</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">Onsite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Salary Min</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={editFields.salary_min}
                        onChange={(e) => setEditFields((f) => ({ ...f, salary_min: e.target.value }))}
                        placeholder="e.g. 90000"
                        className="flex-1"
                      />
                      <Input
                        value={editFields.salary_currency}
                        onChange={(e) => setEditFields((f) => ({ ...f, salary_currency: e.target.value }))}
                        placeholder="USD"
                        className="w-20"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Salary Max</label>
                    <Input
                      type="number"
                      value={editFields.salary_max}
                      onChange={(e) => setEditFields((f) => ({ ...f, salary_max: e.target.value }))}
                      placeholder="e.g. 130000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">H1B Sponsorship</label>
                    <Select value={editFields.h1_sponsor} onValueChange={(v) => setEditFields((f) => ({ ...f, h1_sponsor: v as EditFields['h1_sponsor'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Unknown</SelectItem>
                        <SelectItem value="true">Sponsors</SelectItem>
                        <SelectItem value="false">Does not sponsor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Deadline</label>
                    <Input type="date" value={editFields.deadline} onChange={(e) => setEditFields((f) => ({ ...f, deadline: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Requirements <span className="text-xs">(one per line)</span></label>
                  <Textarea
                    value={editFields.requirements}
                    onChange={(e) => setEditFields((f) => ({ ...f, requirements: e.target.value }))}
                    placeholder="5+ years of Python&#10;Experience with AWS&#10;Strong communication skills"
                    rows={5}
                    className="resize-y font-mono text-sm"
                  />
                </div>
              </CardContent>
            ) : (
              <CardContent className="divide-y">
                <DetailRow label="Company" value={app.company} />
                <DetailRow label="Role" value={app.role} />
                <DetailRow label="Location" value={app.location} />
                <DetailRow
                  label="Work Type"
                  value={app.work_type ? <Badge variant="outline" className="capitalize">{app.work_type}</Badge> : null}
                />
                <DetailRow label="Salary" value={formatSalary(app)} />
                <DetailRow
                  label="H1B Sponsorship"
                  value={
                    app.h1_sponsor === true ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sponsors</Badge>
                    : app.h1_sponsor === false ? <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Does not sponsor</Badge>
                    : null
                  }
                />
                <DetailRow
                  label="Deadline"
                  value={
                    app.deadline
                      ? <span className={new Date(app.deadline) < new Date() ? 'text-red-500' : ''}>
                          {new Date(app.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      : null
                  }
                />
                {app.requirements && app.requirements.length > 0 && (
                  <div className="py-2.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                    <span className="text-sm text-muted-foreground w-36 shrink-0">Requirements</span>
                    <ul className="space-y-1">
                      {app.requirements.map((r, i) => (
                        <li key={i} className="text-sm flex items-start gap-1.5">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote()
                  }}
                />
                <Button onClick={handleAddNote} disabled={savingNote || !noteText.trim()} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">⌘ Enter to submit</p>
            </CardContent>
          </Card>

          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notes yet.</p>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Job Description tab */}
        <TabsContent value="jd" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Job Description</CardTitle>
              <div className="flex items-center gap-2">
                {!editingJD && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => { setEditJDText(app.job_description); setEditingJD(true) }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {editingJD && (
                  <>
                    <Button size="sm" onClick={handleSaveJD} disabled={savingJD || !editJDText.trim()}>
                      {savingJD ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingJD(false)} disabled={savingJD}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingJD ? (
                <>
                  <Textarea
                    value={editJDText}
                    onChange={(e) => setEditJDText(e.target.value)}
                    rows={20}
                    className="resize-y font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    After saving, use <strong>Re-run AI</strong> in the Details tab to re-extract fields from the updated description.
                  </p>
                </>
              ) : (
                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground max-h-[60vh] overflow-y-auto">
                  {app.job_description}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Added {new Date(app.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        {app.updated_at !== app.created_at && (
          <span>· Updated {new Date(app.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        )}
      </div>
    </div>
  )
}
