'use client'

import { AlertCircle, CheckCircle2, Clock, FileWarning, ShieldCheck, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  status?: string | null
  verificationStatus?: string | null
  required?: boolean
  className?: string
}

const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  uploaded: 'Yuklendi',
  verified: 'Dogrulandi',
  rejected: 'Reddedildi',
  expired: 'Suresi Doldu',
  archived: 'Arsiv',
  deleted: 'Silindi',
}

const verificationLabels: Record<string, string> = {
  not_required: 'Dogrulama Yok',
  pending: 'Dogrulama Bekliyor',
  verified: 'Dogrulandi',
  rejected: 'Reddedildi',
}

export function DocumentStatusBadge({ status, verificationStatus, required, className }: Props) {
  const value = status || 'missing'
  const Icon = iconFor(value, verificationStatus)
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium', toneFor(value, verificationStatus), className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {value === 'missing' ? 'Eksik' : statusLabels[value] || value}
      {required ? <span className="ml-1 rounded-sm bg-amber-500/15 px-1 text-amber-700 dark:text-amber-300">Required</span> : null}
      {verificationStatus && verificationStatus !== 'not_required' ? (
        <span className="ml-1 text-muted-foreground">{verificationLabels[verificationStatus] || verificationStatus}</span>
      ) : null}
    </span>
  )
}

function iconFor(status: string, verificationStatus?: string | null) {
  if (verificationStatus === 'verified' || status === 'verified') return ShieldCheck
  if (verificationStatus === 'rejected' || status === 'rejected') return XCircle
  if (status === 'missing' || status === 'expired') return FileWarning
  if (verificationStatus === 'pending') return Clock
  if (status === 'uploaded') return CheckCircle2
  return AlertCircle
}

function toneFor(status: string, verificationStatus?: string | null) {
  if (verificationStatus === 'verified' || status === 'verified') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (verificationStatus === 'rejected' || status === 'rejected') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
  if (status === 'missing' || status === 'expired') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  if (verificationStatus === 'pending') return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
  return 'border-border bg-muted text-muted-foreground'
}

