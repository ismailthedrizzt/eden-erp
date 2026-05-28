'use client'

import Link from 'next/link'
import { AlertCircle, CircleSlash, Lock, Settings2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModuleUnavailableAction {
  label: string
  targetPage?: string
  onClick?: () => void
}

export interface ModuleUnavailableStateProps {
  moduleKey?: string
  moduleName?: string
  title?: string
  message?: string
  status?: 'disabled' | 'unlicensed' | 'setup_required' | 'dependency_missing' | 'feature_disabled' | 'permission_denied' | string
  actions?: ModuleUnavailableAction[]
  className?: string
}

export function ModuleUnavailableState({
  moduleKey,
  moduleName,
  title,
  message,
  status = 'disabled',
  actions = [],
  className,
}: ModuleUnavailableStateProps) {
  const defaults = defaultStateForStatus(status, moduleKey, moduleName)
  const finalActions: ModuleUnavailableAction[] = actions.length > 0 ? actions : defaults.actions
  const Icon = iconForStatus(status)
  return (
    <section
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
        className
      )}
    >
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title || defaults.title}</h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{message || defaults.message}</p>
          {finalActions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {finalActions.map(action => action.targetPage ? (
                <Link
                  key={`${action.label}-${action.targetPage}`}
                  href={action.targetPage}
                  className="inline-flex h-9 items-center rounded-md bg-amber-700 px-3 text-sm font-medium text-white hover:bg-amber-800"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="inline-flex h-9 items-center rounded-md bg-amber-700 px-3 text-sm font-medium text-white hover:bg-amber-800"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ModuleUnavailableState

function iconForStatus(status: string) {
  if (status === 'unlicensed') return Lock
  if (status === 'setup_required') return Wrench
  if (status === 'feature_disabled') return Settings2
  if (status === 'disabled') return CircleSlash
  return AlertCircle
}

function defaultStateForStatus(status: string, moduleKey?: string, moduleName?: string) {
  const setupTarget = `/app/sistem/kurulum${moduleKey ? `?module=${encodeURIComponent(moduleKey)}` : ''}`
  if (status === 'disabled') {
    return {
      title: 'Bu modul aktif degil',
      message: `${moduleName || 'Bu modul'} kullanmak icin calisma alaninizda aktiflestirilmelidir.`,
      actions: [{ label: 'Modul Ayarlarina Git', targetPage: '/app/sistem/module-licenses' }],
    }
  }
  if (status === 'unlicensed') {
    return {
      title: 'Bu modul lisansinizda bulunmuyor',
      message: `${moduleName || 'Bu modul'} icin lisans kapsaminizi kontrol edin.`,
      actions: [{ label: 'Lisans Bilgilerini Gor', targetPage: '/app/sistem/module-licenses' }],
    }
  }
  if (status === 'setup_required') {
    return {
      title: 'Kurulum tamamlanmamis',
      message: `${moduleName || 'Bu modul'} kullanilmadan once birkac kurulum adimi tamamlanmalidir.`,
      actions: [{ label: 'Kurulumu Tamamla', targetPage: setupTarget }],
    }
  }
  if (status === 'dependency_missing') {
    return {
      title: 'Gerekli modul aktif degil',
      message: 'Bu islem baska bir module ihtiyac duyuyor.',
      actions: [{ label: 'Kurulum Merkezine Git', targetPage: setupTarget }],
    }
  }
  if (status === 'feature_disabled') {
    return {
      title: 'Bu ozellik kapali',
      message: 'Bu ozellik calisma alaninizda su anda kapali.',
      actions: [{ label: 'Ozellik Ayarlarina Git', targetPage: '/app/sistem/module-licenses' }],
    }
  }
  return {
    title: 'Bu alan kullanilamiyor',
    message: 'Bu islem veya modul su anda kullanilamiyor.',
    actions: [{ label: 'Kurulum Merkezine Git', targetPage: setupTarget }],
  }
}
