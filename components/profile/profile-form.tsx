'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  anthropicKey: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface ProfileFormProps {
  userId: string
  initialFullName: string
  email: string
  initialApiKey: string
  todayCount: number
  hasOwnKey: boolean
}

const FREE_DAILY_LIMIT = 3

export function ProfileForm({
  userId,
  initialFullName,
  email,
  initialApiKey,
  todayCount,
  hasOwnKey,
}: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initialFullName,
      anthropicKey: initialApiKey ? '••••••••••••••••' : '',
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const updateData: ProfileUpdate = {
      full_name: data.fullName,
    }

    if (data.anthropicKey && data.anthropicKey !== '••••••••••••••••') {
      updateData.anthropic_key = data.anthropicKey
    } else if (!data.anthropicKey) {
      updateData.anthropic_key = null
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated')
    }
    setLoading(false)
  }

  const usagePercent = Math.min((todayCount / FREE_DAILY_LIMIT) * 100, 100)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          placeholder="Jane Doe"
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled className="text-muted-foreground" />
      </div>

      <Separator />

      {/* Anthropic API Key */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="anthropicKey">Anthropic API Key</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used for resume tailoring and cover letter generation. Your key is stored securely.
          </p>
        </div>
        <div className="relative">
          <Input
            id="anthropicKey"
            type={showKey ? 'text' : 'password'}
            placeholder="sk-ant-api03-..."
            className="pr-10"
            {...register('anthropicKey')}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Daily usage indicator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Free tailorings today
            </span>
            <span className={todayCount >= FREE_DAILY_LIMIT && !hasOwnKey ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {todayCount} / {FREE_DAILY_LIMIT}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 100 ? 'bg-destructive' : usagePercent >= 66 ? 'bg-yellow-500' : 'bg-primary'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {!hasOwnKey && todayCount >= FREE_DAILY_LIMIT && (
            <p className="text-xs text-destructive">
              Daily free limit reached. Add your Anthropic API key above for unlimited use.
            </p>
          )}
          {hasOwnKey && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Using your own API key — no daily limit applied.
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading || !isDirty}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  )
}
