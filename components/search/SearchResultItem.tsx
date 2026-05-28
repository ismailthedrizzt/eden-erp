'use client'

import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CircleHelp,
  Clock,
  Compass,
  Cpu,
  FilePenLine,
  FileText,
  FileUp,
  GitBranch,
  Handshake,
  ListChecks,
  Lock,
  Mail,
  MapPin,
  Package,
  PlayCircle,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/lib/services/search'

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CircleHelp,
  Clock,
  Compass,
  Cpu,
  FilePenLine,
  FileText,
  FileUp,
  GitBranch,
  Handshake,
  ListChecks,
  Lock,
  Mail,
  MapPin,
  Package,
  PlayCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
}

type SearchResultItemProps = {
  result: SearchResult
  active?: boolean
  onSelect: (result: SearchResult) => void
}

export function SearchResultItem({ result, active = false, onSelect }: SearchResultItemProps) {
  const Icon = result.icon ? ICONS[result.icon] || Search : Search
  const disabled = Boolean(result.disabled)

  return (
    <button
      id={result.id}
      type="button"
      role="option"
      aria-selected={active}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onSelect(result)}
      className={cn(
        'group flex min-h-[4.25rem] w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition',
        active
          ? 'border-eden-blue bg-eden-blue/5 shadow-sm dark:border-sky-500 dark:bg-sky-950/25'
          : 'border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-eden-navy-3',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-eden-blue dark:border-gray-700 dark:bg-eden-navy dark:text-sky-200">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{result.title}</span>
          {result.badge && (
            <span className="shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-300">
              {result.badge}
            </span>
          )}
          {result.status && (
            <span className="hidden shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-eden-navy dark:text-gray-300 sm:inline-flex">
              {result.status}
            </span>
          )}
        </span>
        {result.subtitle && (
          <span className="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{result.subtitle}</span>
        )}
        {disabled && result.disabled_reason && (
          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Lock size={12} />
            <span className="truncate">{result.disabled_reason}</span>
          </span>
        )}
      </span>
      {disabled ? (
        <AlertTriangle size={16} className="shrink-0 text-amber-500" />
      ) : (
        <ArrowRight size={16} className="shrink-0 text-gray-300 transition group-hover:text-eden-blue dark:text-gray-600" />
      )}
    </button>
  )
}
