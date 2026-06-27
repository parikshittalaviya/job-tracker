import { Badge } from '@/components/ui/badge'
import type { AppStatus } from '@/types/database'

const STATUS_CONFIG: Record<AppStatus, { label: string; className: string }> = {
  saved:        { label: 'Saved',         className: 'bg-muted text-muted-foreground hover:bg-muted' },
  applied:      { label: 'Applied',       className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200' },
  phone_screen: { label: 'Phone Screen',  className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200' },
  technical:    { label: 'Technical',     className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-200' },
  onsite:       { label: 'Onsite',        className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-200' },
  offer:        { label: 'Offer',         className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200' },
  accepted:     { label: 'Accepted',      className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-200' },
  rejected:     { label: 'Rejected',      className: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200' },
}

export const ALL_STATUSES = Object.keys(STATUS_CONFIG) as AppStatus[]

export function StatusBadge({ status }: { status: AppStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  )
}

export function statusLabel(status: AppStatus): string {
  return STATUS_CONFIG[status]?.label ?? status
}
