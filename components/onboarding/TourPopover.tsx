'use client'

import { ArrowLeft, ArrowRight, Check, Clock3, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { TourPlacement, TourStep, TourTargetRect } from '@/lib/onboarding/types'
import { cn } from '@/lib/utils'

interface TourPopoverProps {
  step: TourStep
  rect: TourTargetRect | null
  stepIndex: number
  totalSteps: number
  canGoBack: boolean
  isLastStep: boolean
  isTargetReady?: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  onPostpone: () => void
  onComplete: () => void
}

const POPOVER_WIDTH = 360
const GAP = 16

export function TourPopover({
  step,
  rect,
  stepIndex,
  totalSteps,
  canGoBack,
  isLastStep,
  isTargetReady = true,
  onBack,
  onNext,
  onSkip,
  onPostpone,
  onComplete,
}: TourPopoverProps) {
  const viewport = useViewportSize()
  const isMobile = viewport.width < 640
  const placement = resolvePlacement(step.placement || 'auto', rect, viewport)

  const style = useMemo(() => {
    if (isMobile) {
      return {
        left: 12,
        right: 12,
        bottom: 12,
        width: 'auto',
      } as const
    }

    if (!rect) {
      return {
        left: Math.max(12, (viewport.width - POPOVER_WIDTH) / 2),
        top: Math.max(12, viewport.height / 2 - 140),
        width: POPOVER_WIDTH,
      }
    }

    const topForSide = clamp(rect.top + rect.height / 2 - 130, 12, viewport.height - 292)
    const leftForCenter = clamp(rect.left + rect.width / 2 - POPOVER_WIDTH / 2, 12, viewport.width - POPOVER_WIDTH - 12)

    if (placement === 'right') {
      return {
        left: clamp(rect.left + rect.width + GAP, 12, viewport.width - POPOVER_WIDTH - 12),
        top: topForSide,
        width: POPOVER_WIDTH,
      }
    }

    if (placement === 'left') {
      return {
        left: clamp(rect.left - POPOVER_WIDTH - GAP, 12, viewport.width - POPOVER_WIDTH - 12),
        top: topForSide,
        width: POPOVER_WIDTH,
      }
    }

    if (placement === 'top') {
      return {
        left: leftForCenter,
        top: clamp(rect.top - 280 - GAP, 12, viewport.height - 292),
        width: POPOVER_WIDTH,
      }
    }

    return {
      left: leftForCenter,
      top: clamp(rect.top + rect.height + GAP, 12, viewport.height - 292),
      width: POPOVER_WIDTH,
    }
  }, [isMobile, placement, rect, viewport.height, viewport.width])

  return (
    <div
      className={cn(
        'fixed z-[100] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950',
        isMobile && 'rounded-b-none'
      )}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-tour-title"
    >
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {stepIndex + 1} / {totalSteps}
            </div>
            <h2 id="system-tour-title" className="text-base font-semibold text-gray-950 dark:text-white">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onPostpone}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Daha sonra göster"
            title="Daha sonra göster"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-200"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          {step.description}
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <ArrowLeft size={15} />
            Geri
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={!isTargetReady}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={15} />
              {isTargetReady ? 'Tamamla' : 'Hazırlanıyor'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!isTargetReady}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTargetReady ? 'İleri' : 'Hazırlanıyor'}
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-left text-xs font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Tanıtımı Atla
          </button>
          <button
            type="button"
            onClick={onPostpone}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Clock3 size={13} />
            Daha Sonra Göster
          </button>
        </div>
      </div>
    </div>
  )
}

function resolvePlacement(
  preferred: TourPlacement,
  rect: TourTargetRect | null,
  viewport: { width: number; height: number }
): Exclude<TourPlacement, 'auto'> {
  if (!rect) return 'bottom'

  const available = {
    top: rect.top,
    bottom: viewport.height - (rect.top + rect.height),
    left: rect.left,
    right: viewport.width - (rect.left + rect.width),
  }

  if (preferred !== 'auto' && available[preferred] > 300) return preferred

  return (Object.entries(available).sort((a, b) => b[1] - a[1])[0]?.[0] || 'bottom') as Exclude<TourPlacement, 'auto'>
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function useViewportSize() {
  const [size, setSize] = useState({ width: 1024, height: 768 })

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return size
}
