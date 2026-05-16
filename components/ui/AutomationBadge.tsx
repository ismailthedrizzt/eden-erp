'use client'

import { Bot, CheckCircle2, Loader2, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AutomationBadgeStatus = 'idle' | 'input' | 'working' | 'done' | 'no_data'

export interface AutomationBadgeProps {
  status: AutomationBadgeStatus
  title?: string
  idleLabel?: string
  inputLabel?: string
  workingLabel?: string
  doneLabel?: string
  noDataLabel?: string
  className?: string
}

export function AutomationBadge({
  status,
  title,
  idleLabel = 'Veri Bekleniyor',
  inputLabel = 'Veri Girişi Yapılıyor',
  workingLabel = 'Sorgulama Yapılıyor',
  doneLabel = 'Veriler Çekildi',
  noDataLabel = 'Veri Bulunamadı',
  className,
}: AutomationBadgeProps) {
  const config = {
    idle: {
      label: idleLabel,
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
      icon: <Bot size={12} />,
    },
    input: {
      label: inputLabel,
      className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
      icon: <PencilLine size={12} />,
    },
    working: {
      label: workingLabel,
      className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
      icon: <Loader2 size={12} className="animate-spin" />,
    },
    done: {
      label: doneLabel,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
      icon: <CheckCircle2 size={12} />,
    },
    no_data: {
      label: noDataLabel,
      className: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
      icon: <Bot size={12} />,
    },
  }[status]

  return (
    <span
      title={title || `Otomasyon: ${config.label}`}
      className={cn(
        'inline-flex h-5 min-w-[136px] items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-semibold leading-none transition-colors',
        status === 'working' && 'animate-pulse',
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  )
}
