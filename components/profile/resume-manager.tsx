'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, Trash2, Star, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Resume } from '@/types/database'

export function ResumeManager({ initialResumes }: { initialResumes: Resume[] }) {
  const [resumes, setResumes] = useState(initialResumes)
  const [uploading, setUploading] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Select a file first'); return }
    if (!nameInput.trim()) { toast.error('Give this resume a name'); return }

    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('name', nameInput.trim())

    const res = await fetch('/api/resumes/upload', { method: 'POST', body: form })
    const json = await res.json() as Resume & { error?: string }

    if (res.ok) {
      setResumes((prev) => [...prev, json])
      setNameInput('')
      if (fileRef.current) fileRef.current.value = ''
      toast.success('Resume uploaded')
    } else {
      toast.error(json.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  async function handleSetDefault(id: string) {
    setSettingDefault(id)
    const res = await fetch(`/api/resumes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    })
    if (res.ok) {
      setResumes((prev) => prev.map((r) => ({ ...r, is_default: r.id === id })))
      toast.success('Default resume updated')
    } else {
      toast.error('Failed to update default')
    }
    setSettingDefault(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this resume? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setResumes((prev) => prev.filter((r) => r.id !== id))
      toast.success('Resume deleted')
    } else {
      toast.error('Failed to delete')
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder='Resume name (e.g. "General", "SDE Resume")'
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={() => {
            const file = fileRef.current?.files?.[0]
            if (file && !nameInput.trim()) {
              setNameInput(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
            }
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2 shrink-0">
          <Upload className="h-4 w-4" />
          {fileRef.current?.files?.[0]?.name ?? 'Choose File'}
        </Button>
        <Button onClick={handleUpload} disabled={uploading} className="gap-2 shrink-0">
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : 'Upload'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">PDF or DOCX, max 5 MB</p>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          No resumes uploaded yet. Upload one above to enable AI tailoring.
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3 px-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{r.name}</span>
                  {r.mime_type === 'application/pdf'
                    ? <Badge variant="outline" className="text-xs shrink-0">PDF</Badge>
                    : <Badge variant="outline" className="text-xs shrink-0">DOCX</Badge>}
                  {r.is_default && (
                    <Badge className="text-xs shrink-0 bg-primary/10 text-primary hover:bg-primary/10">
                      <Star className="h-2.5 w-2.5 mr-1" /> Default
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!r.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleSetDefault(r.id)}
                      disabled={settingDefault === r.id}
                    >
                      {settingDefault === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Set default'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                  >
                    {deleting === r.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
