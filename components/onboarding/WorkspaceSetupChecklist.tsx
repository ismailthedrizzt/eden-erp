'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Loader2, Lock, PlayCircle } from 'lucide-react'
import type { OnboardingChecklistItem, OnboardingOverview } from '@/lib/services/onboarding'
import { cn } from '@/lib/utils'

type WorkspaceSetupChecklistProps = {
  overview: OnboardingOverview
  busyStep?: string | null
  onCompleteStep?: (stepKey: string) => void
  onOpenActionCenter?: () => void
}

export function WorkspaceSetupChecklist({
  overview,
  busyStep,
  onCompleteStep,
  onOpenActionCenter,
}: WorkspaceSetupChecklistProps) {
  const steps = overview.recommended_steps || []
  const completed = steps.filter(step => step.status === 'completed').length
  const progress = steps.length ? Math.round((completed / steps.length) * 100) : 0

  return (
    <section data-tour-id="workspace-onboarding-checklist" className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Calisma alani kurulum listesi</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Teknik kurulum yerine baslangic icin siradaki isleri gosterir.</p>
          </div>
          <div className="min-w-[220px]">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{completed}/{steps.length} adim tamamlandi</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {steps.map(step => (
          <ChecklistRow
            key={step.key}
            step={step}
            busy={busyStep === step.key}
            onCompleteStep={onCompleteStep}
            onOpenActionCenter={onOpenActionCenter}
          />
        ))}
      </div>
    </section>
  )
}

function ChecklistRow({
  step,
  busy,
  onCompleteStep,
  onOpenActionCenter,
}: {
  step: OnboardingChecklistItem
  busy?: boolean
  onCompleteStep?: (stepKey: string) => void
  onOpenActionCenter?: () => void
}) {
  const Icon = iconForStatus(step.status)
  const actionDisabled = Boolean(step.disabled_reason)
  const actionContent = (
    <>
      {step.action_label}
      <ArrowRight size={15} />
    </>
  )

  return (
    <article className={cn('rounded-lg border bg-white p-4 shadow-sm dark:bg-white/[0.03]', toneClass(step.status))}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{step.title}</h3>
              <StatusBadge status={step.status} />
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>
            {step.disabled_reason && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-200">
                <Lock size={13} />
                {step.disabled_reason}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          {step.key === 'finish' && onCompleteStep ? (
            <button
              type="button"
              onClick={() => onCompleteStep(step.key)}
              disabled={busy || actionDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Tamamla
            </button>
          ) : step.target_page.includes('open=action-center') && onOpenActionCenter ? (
            <button
              type="button"
              onClick={onOpenActionCenter}
              disabled={actionDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {actionContent}
            </button>
          ) : (
            <Link
              href={actionDisabled ? '#' : step.target_page}
              aria-disabled={actionDisabled}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10',
                actionDisabled && 'pointer-events-none opacity-60'
              )}
            >
              {actionContent}
            </Link>
          )}
          {step.status !== 'completed' && onCompleteStep && step.key !== 'finish' && (
            <button
              type="button"
              onClick={() => onCompleteStep(step.key)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Isaretle
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: OnboardingChecklistItem['status'] }) {
  const labels: Record<OnboardingChecklistItem['status'], string> = {
    completed: 'Tamamlandi',
    current: 'Siradaki',
    pending: 'Bekliyor',
    warning: 'Dikkat',
    blocked: 'Engelli',
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
      {labels[status]}
    </span>
  )
}

function iconForStatus(status: OnboardingChecklistItem['status']) {
  if (status === 'completed') return CheckCircle2
  if (status === 'warning' || status === 'blocked') return AlertTriangle
  if (status === 'current') return PlayCircle
  return Circle
}

function toneClass(status: OnboardingChecklistItem['status']) {
  if (status === 'completed') return 'border-emerald-200 dark:border-emerald-300/20'
  if (status === 'warning') return 'border-amber-200 dark:border-amber-300/20'
  if (status === 'blocked') return 'border-red-200 dark:border-red-300/20'
  if (status === 'current') return 'border-sky-200 dark:border-sky-300/20'
  return 'border-slate-200 dark:border-white/10'
}
