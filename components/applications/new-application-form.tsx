'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  job_description: z.string(),
}).refine(
  (d) => (d.url && d.url.trim().length > 0) || (d.job_description && d.job_description.trim().length > 50),
  { message: 'Paste the job description (or provide a URL)', path: ['job_description'] }
)

type FormData = z.infer<typeof schema>

export function NewApplicationForm({ dailyUsed, dailyLimit }: { dailyUsed: number; dailyLimit: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', job_description: '' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.url?.trim() || undefined,
          job_description: data.job_description?.trim() || '',
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to save application')
        return
      }

      if (json.fetch_error) {
        toast.warning(`URL fetch failed (${json.fetch_error}) — used pasted description instead`)
      }

      if (!json.ai_extracted) {
        toast.info('Saved without AI extraction — set your Anthropic key in Profile for auto-fill')
      } else {
        toast.success('Application saved and fields extracted!')
      }

      router.push(`/applications/${json.id}`)
    } finally {
      setLoading(false)
    }
  }

  const remaining = dailyLimit - dailyUsed
  const limitReached = remaining <= 0

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Job Application</CardTitle>
        <CardDescription>
          Paste a URL or the job description. Claude will auto-fill the details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="url">Job Posting URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="url"
              type="url"
              placeholder="https://jobs.example.com/..."
              autoComplete="off"
              {...register('url')}
            />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job_description">Job Description</Label>
            <Textarea
              id="job_description"
              placeholder="Paste the full job description here..."
              rows={12}
              className="resize-y font-mono text-sm"
              {...register('job_description')}
            />
            {errors.job_description && (
              <p className="text-xs text-destructive">{errors.job_description.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {limitReached
                ? 'Daily AI limit reached (3/3). Add your Anthropic key in Profile for unlimited.'
                : `${remaining} AI extraction${remaining === 1 ? '' : 's'} remaining today`}
            </p>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                : <><Sparkles className="h-4 w-4" /> Save & Extract</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
