'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TourStep, TourTargetRect } from '@/lib/onboarding/types'
import { readCachedUiPreferences, syncUiPreferencesPatch } from '@/lib/user-state/client'
import { TourPopover } from './TourPopover'
import { TourSpotlight } from './TourSpotlight'

interface PageContextTourProps {
  tourKey: string
  steps: TourStep[]
  enabled?: boolean
  autoStart?: boolean
  version?: string
}

export function PageContextTour({
  tourKey,
  steps,
  enabled = true,
  autoStart = true,
  version = 'v2',
}: PageContextTourProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null)
  const postponedRef = useRef(false)
  const activeStep = steps[activeIndex]

  const dismissed = useMemo(() => {
    const preferences = readCachedUiPreferences()
    return preferences.dismissedPageTours?.includes(tourKey)
  }, [tourKey])

  useEffect(() => {
    if (!enabled || !autoStart || dismissed || postponedRef.current || !steps.length) return
    const timer = window.setTimeout(() => setOpen(true), 800)
    return () => window.clearTimeout(timer)
  }, [autoStart, dismissed, enabled, steps.length])

  useEffect(() => {
    const onStart = (event: Event) => {
      const detail = (event as CustomEvent<{ tourKey?: string }>).detail
      if (detail?.tourKey && detail.tourKey !== tourKey) return
      if (!steps.length) return
      postponedRef.current = false
      setActiveIndex(0)
      setTargetRect(null)
      setOpen(true)
    }

    window.addEventListener('eden:start-page-tour', onStart)
    return () => window.removeEventListener('eden:start-page-tour', onStart)
  }, [steps.length, tourKey])

  useEffect(() => {
    if (!open || !activeStep) {
      setTargetRect(null)
      return
    }

    let cancelled = false
    let attempts = 0
    let resizeObserver: ResizeObserver | null = null
    let retryTimer: number | null = null
    let detach: (() => void) | null = null

    const updateRect = (target: HTMLElement) => {
      if (cancelled || !document.body.contains(target)) return
      const rect = target.getBoundingClientRect()
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    }

    const attach = (target: HTMLElement) => {
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
      const refresh = () => updateRect(target)
      window.setTimeout(refresh, 240)
      resizeObserver = new ResizeObserver(refresh)
      resizeObserver.observe(target)
      window.addEventListener('resize', refresh)
      window.addEventListener('scroll', refresh, true)
      return () => {
        window.removeEventListener('resize', refresh)
        window.removeEventListener('scroll', refresh, true)
      }
    }

    const resolve = () => {
      if (cancelled) return
      const target = findTarget(activeStep)
      if (!target) {
        attempts += 1
        if (attempts < 35) {
          retryTimer = window.setTimeout(resolve, 120)
          return
        }
        if (activeIndex < steps.length - 1) {
          setActiveIndex(index => index + 1)
        } else {
          setOpen(false)
        }
        return
      }
      detach = attach(target)
    }

    resolve()

    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
      resizeObserver?.disconnect()
      detach?.()
    }
  }, [activeIndex, activeStep, open, steps.length])

  const closeAndRemember = useCallback(async () => {
    const preferences = readCachedUiPreferences()
    const dismissedPageTours = Array.from(new Set([...(preferences.dismissedPageTours || []), tourKey]))
    await syncUiPreferencesPatch({ dismissedPageTours, lastTourVersion: version }).catch(() => undefined)
    setOpen(false)
  }, [tourKey, version])

  const postpone = useCallback(() => {
    postponedRef.current = true
    setOpen(false)
  }, [])

  const next = useCallback(() => {
    if (activeIndex < steps.length - 1) {
      setTargetRect(null)
      setActiveIndex(index => index + 1)
    } else {
      void closeAndRemember()
    }
  }, [activeIndex, closeAndRemember, steps.length])

  const back = useCallback(() => {
    if (activeIndex > 0) {
      setTargetRect(null)
      setActiveIndex(index => index - 1)
    }
  }, [activeIndex])

  if (!open || !activeStep) return null

  return (
    <>
      <TourSpotlight rect={targetRect} />
      <TourPopover
        step={activeStep}
        rect={targetRect}
        stepIndex={activeIndex}
        totalSteps={steps.length}
        canGoBack={activeIndex > 0}
        isLastStep={activeIndex >= steps.length - 1}
        isTargetReady={Boolean(targetRect)}
        onBack={back}
        onNext={next}
        onSkip={closeAndRemember}
        onPostpone={postpone}
        onComplete={closeAndRemember}
      />
    </>
  )
}

function findTarget(step: TourStep) {
  const selectors = [step.target, ...(Array.isArray(step.fallbackTarget) ? step.fallbackTarget : step.fallbackTarget ? [step.fallbackTarget] : [])]
  for (const selector of selectors) {
    const target = document.querySelector<HTMLElement>(selector)
    if (!target) continue
    const rect = target.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return target
  }
  return null
}
