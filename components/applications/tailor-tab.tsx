'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sparkles, Download, Loader2, RefreshCw, FileText, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Resume, TailoredResume, CoverLetter } from '@/types/database'

type TailorData = {
  tailored: (TailoredResume & { pdf_url?: string | null; docx_url?: string | null }) | null
  coverLetter: (CoverLetter & { pdf_url?: string | null; docx_url?: string | null }) | null
}

function DownloadRow({
  label, pdfUrl, docxUrl,
}: { label: string; pdfUrl?: string | null; docxUrl?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {pdfUrl && (
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-3 w-3" /> PDF
            </a>
          </Button>
        )}
        {docxUrl && (
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" asChild>
            <a href={docxUrl} target="_blank" rel="noopener noreferrer" download>
              <FileType className="h-3 w-3" /> DOCX
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

export function TailorTab({
  applicationId,
  resumes,
  dailyUsed,
  dailyLimit,
}: {
  applicationId: string
  resumes: Resume[]
  dailyUsed: number
  dailyLimit: number
}) {
  const defaultResume = resumes.find((r) => r.is_default) ?? resumes[0] ?? null
  const [selectedResumeId, setSelectedResumeId] = useState(defaultResume?.id ?? '')
  const [tailoring, setTailoring] = useState(false)
  const [data, setData] = useState<TailorData | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(true)

  // Load existing tailored docs on mount
  useEffect(() => {
    fetch(`/api/applications/${applicationId}/tailor`)
      .then((r) => r.json())
      .then((json: TailorData) => setData(json))
      .catch(() => {})
      .finally(() => setLoadingExisting(false))
  }, [applicationId])

  const remaining = dailyLimit - dailyUsed
  const limitReached = remaining <= 0

  async function handleTailor() {
    if (!selectedResumeId) { toast.error('Select a resume first'); return }
    setTailoring(true)
    const res = await fetch(`/api/applications/${applicationId}/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: selectedResumeId }),
    })
    const json = await res.json() as TailorData & { error?: string }
    if (res.ok) {
      setData(json)
      toast.success('Resume tailored and cover letter generated!')
    } else {
      toast.error(json.error ?? 'Tailoring failed')
    }
    setTailoring(false)
  }

  if (resumes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No resumes uploaded yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">Go to Profile to upload a resume</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Trigger card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tailor Resume + Cover Letter</CardTitle>
          <CardDescription>
            Claude will rewrite your resume to match this job and generate a cover letter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select resume" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.is_default && ' (default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleTailor} disabled={tailoring || !selectedResumeId} className="gap-2 shrink-0">
              {tailoring
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Tailoring… (~20s)</>
                : data?.tailored
                  ? <><RefreshCw className="h-4 w-4" /> Re-generate</>
                  : <><Sparkles className="h-4 w-4" /> Tailor + Cover Letter</>}
            </Button>
          </div>

          {limitReached ? (
            <p className="text-xs text-destructive">
              Daily free limit reached (3/3). Add your Anthropic API key in{' '}
              <Link href="/profile" className="underline">Profile</Link> to continue.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {remaining} free tailoring{remaining === 1 ? '' : 's'} remaining today
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loadingExisting ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : data?.tailored || data?.coverLetter ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Generated Documents</CardTitle>
              <Badge variant="outline" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" /> AI generated
              </Badge>
            </div>
            {data.tailored && (
              <CardDescription className="text-xs">
                Generated {new Date(data.tailored.created_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="divide-y">
            {data.tailored && (
              <DownloadRow
                label="Tailored Resume"
                pdfUrl={data.tailored.pdf_url}
                docxUrl={data.tailored.docx_url}
              />
            )}
            {data.coverLetter && (
              <>
                <DownloadRow
                  label="Cover Letter"
                  pdfUrl={data.coverLetter.pdf_url}
                  docxUrl={data.coverLetter.docx_url}
                />
                <div className="pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Cover Letter Preview</p>
                  <div className="bg-muted/40 rounded-md p-3 max-h-48 overflow-y-auto">
                    <p className="text-xs whitespace-pre-wrap">{data.coverLetter.content}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : !tailoring ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
          No tailored documents yet. Select a resume and click Tailor above.
        </div>
      ) : null}
    </div>
  )
}
