'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import type { TourStep, TourTargetRect } from '@/lib/onboarding/types'
import { systemTourSteps } from './tourSteps'
import { TourPopover } from './TourPopover'
import { TourSpotlight } from './TourSpotlight'

interface GuidedSystemTourProps {
  open: boolean
  initialStepId?: string | null
  onOpenChange?: (open: boolean) => void
}

type TourEndpoint = 'start' | 'step' | 'complete' | 'skip' | 'postpone'

export function GuidedSystemTour({ open, initialStepId, onOpenChange }: GuidedSystemTourProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialIndex = useMemo(() => {
    const index = systemTourSteps.findIndex(step => step.id === initialStepId)
    return index >= 0 ? index : 0
  }, [initialStepId])
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null)
  const [navigatingStepId, setNavigatingStepId] = useState<string | null>(null)
  const startedRef = useRef(false)
  const finishingRef = useRef(false)

  const activeStep = systemTourSteps[activeIndex] || systemTourSteps[0]
  const currentRoute = useMemo(() => {
    const query = searchParams.toString()
    return `${pathname}${query ? `?${query}` : ''}`
  }, [pathname, searchParams])

  useEffect(() => {
    if (!open) {
      startedRef.current = false
      finishingRef.current = false
      setTargetRect(null)
      setNavigatingStepId(null)
      return
    }

    setNavigatingStepId(null)
    setActiveIndex(initialIndex)
  }, [initialIndex, open])

  useEffect(() => {
    if (!open || startedRef.current) return
    startedRef.current = true
    void postTourEvent('start', { stepId: activeStep.id })
  }, [activeStep.id, open])

  useEffect(() => {
    if (!open || !activeStep) return
    void postTourEvent('step', { stepId: activeStep.id })
  }, [activeStep, open])

  const completeTour = useCallback(async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    await postTourEvent('complete', { stepId: activeStep.id })
    onOpenChange?.(false)
  }, [activeStep.id, onOpenChange])

  const skipTour = useCallback(async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    await postTourEvent('skip', { stepId: activeStep.id })
    onOpenChange?.(false)
  }, [activeStep.id, onOpenChange])

  const postponeTour = useCallback(async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    await postTourEvent('postpone', { stepId: activeStep.id })
    onOpenChange?.(false)
  }, [activeStep.id, onOpenChange])

  const goBack = useCallback(() => {
    if (navigatingStepId) return

    if (activeIndex > 0) {
      setTargetRect(null)
      setActiveIndex(activeIndex - 1)
    }
  }, [activeIndex, navigatingStepId])

  const goNext = useCallback(() => {
    if (navigatingStepId) return

    if (activeStep.navigateOnNext) {
      setTargetRect(null)
      setNavigatingStepId(activeStep.id)
      router.push(activeStep.navigateOnNext)
      return
    }

    if (activeStep.clickOnNext) {
      setTargetRect(null)
      setNavigatingStepId(activeStep.id)
      void clickTourTargets(activeStep.clickOnNext).finally(() => {
        setNavigatingStepId(null)
        setActiveIndex(currentIndex => Math.min(currentIndex + 1, systemTourSteps.length - 1))
      })
      return
    }

    if (activeIndex < systemTourSteps.length - 1) {
      setTargetRect(null)
      setActiveIndex(activeIndex + 1)
      return
    }

    void completeTour()
  }, [activeIndex, activeStep.clickOnNext, activeStep.id, activeStep.navigateOnNext, completeTour, navigatingStepId, router])

  useEffect(() => {
    if (!open || !activeStep || navigatingStepId !== activeStep.id || !activeStep.navigateOnNext) return
    if (!doesStepPathMatch(activeStep.navigateOnNext, pathname, currentRoute)) return

    setNavigatingStepId(null)
    setTargetRect(null)
    setActiveIndex(currentIndex => Math.min(currentIndex + 1, systemTourSteps.length - 1))
  }, [activeStep, currentRoute, navigatingStepId, open, pathname])

  useEffect(() => {
    if (!open || !activeStep) return
    if (navigatingStepId === activeStep.id) return

    if (activeStep.path && !doesStepPathMatch(activeStep.path, pathname, currentRoute)) {
      const currentRouteTarget = activeStep.allowCurrentRouteTarget
        ? findTourTarget(getStepTargetSelectors(activeStep))
        : null

      if (!currentRouteTarget) {
        setTargetRect(null)
        router.push(activeStep.path)
        return
      }
    }

    let cancelled = false
    let attempts = 0
    let resizeObserver: ResizeObserver | null = null
    let firstFrame: number | null = null
    let secondFrame: number | null = null
    let retryTimer: number | null = null
    let preparedOpeners = false

    const updateRect = (target: HTMLElement) => {
      if (cancelled || !document.body.contains(target)) return
      const rect = target.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }

    const attachToTarget = (target: HTMLElement) => {
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })

      const refresh = () => updateRect(target)
      firstFrame = window.requestAnimationFrame(refresh)
      secondFrame = window.setTimeout(refresh, 280)
      resizeObserver = new ResizeObserver(refresh)
      resizeObserver.observe(target)
      window.addEventListener('resize', refresh)
      window.addEventListener('scroll', refresh, true)

      return () => {
        window.removeEventListener('resize', refresh)
        window.removeEventListener('scroll', refresh, true)
      }
    }

    let detachTargetListeners: (() => void) | null = null

    const maxTargetAttempts = activeStep.skipIfUnavailable ? 3 : 150

    const resolveTarget = () => {
      if (cancelled) return

      if (!preparedOpeners && activeStep.openBeforeTarget) {
        preparedOpeners = true
        void openTourTargets(activeStep.openBeforeTarget).finally(() => {
          if (!cancelled) retryTimer = window.setTimeout(resolveTarget, 80)
        })
        return
      }

      const target = findTourTarget(getStepTargetSelectors(activeStep))
      if (!target) {
        attempts += 1
        if (attempts < maxTargetAttempts) {
          retryTimer = window.setTimeout(resolveTarget, 160)
          return
        }

        setTargetRect(null)
        if (activeIndex < systemTourSteps.length - 1) {
          setActiveIndex(activeIndex + 1)
          return
        }

        if (activeIndex > 0) {
          void completeTour()
        } else {
          onOpenChange?.(false)
        }
        return
      }

      detachTargetListeners = attachToTarget(target)
    }

    resolveTarget()

    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
      if (firstFrame) window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.clearTimeout(secondFrame)
      resizeObserver?.disconnect()
      detachTargetListeners?.()
    }
  }, [activeIndex, activeStep, completeTour, currentRoute, navigatingStepId, onOpenChange, open, pathname, router])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        void postponeTour()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, postponeTour])

  if (!open || !activeStep) return null

  return (
    <>
      <TourSpotlight rect={targetRect} padding={activeStep.spotlightPadding} />
      <TourPopover
        step={activeStep}
        rect={targetRect}
        stepIndex={activeIndex}
        totalSteps={systemTourSteps.length}
        canGoBack={activeIndex > 0 && !navigatingStepId}
        isLastStep={activeIndex >= systemTourSteps.length - 1}
        isTargetReady={Boolean(targetRect) && navigatingStepId !== activeStep.id}
        onBack={goBack}
        onNext={goNext}
        onSkip={skipTour}
        onPostpone={postponeTour}
        onComplete={completeTour}
      />
    </>
  )
}

function doesStepPathMatch(stepPath: string, pathname: string, currentRoute: string) {
  return stepPath.includes('?') ? currentRoute === stepPath : pathname === stepPath
}

async function clickTourTargets(selectors: string | string[]) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors]

  for (const selector of selectorList) {
    const target = await waitForTourTarget(selector)
    target?.click()
    await delay(240)
  }
}

async function openTourTargets(selectors: string | string[]) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors]

  for (const selector of selectorList) {
    const target = await waitForTourTarget(selector)
    if (!target) continue

    if (target.getAttribute('aria-expanded') !== 'true') {
      target.click()
    }
    await delay(220)
  }
}

function waitForTourTarget(selector: string) {
  return new Promise<HTMLElement | null>(resolve => {
    let attempts = 0

    const findTarget = () => {
      const target = document.querySelector<HTMLElement>(selector)
      if (target && isTourTargetClickable(target)) {
        resolve(target)
        return
      }

      attempts += 1
      if (attempts >= 40) {
        resolve(null)
        return
      }

      window.setTimeout(findTarget, 100)
    }

    findTarget()
  })
}

function getStepTargetSelectors(step: TourStep) {
  const fallbackTargets = Array.isArray(step.fallbackTarget)
    ? step.fallbackTarget
    : step.fallbackTarget
      ? [step.fallbackTarget]
      : []

  return [step.target, ...fallbackTargets]
}

function findTourTarget(selectors: string[]) {
  for (const selector of selectors) {
    const target = document.querySelector<HTMLElement>(selector)
    if (target && isTourTargetVisible(target)) return target
  }

  return null
}

function isTourTargetVisible(target: HTMLElement) {
  const rect = target.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function isTourTargetClickable(target: HTMLElement) {
  const rect = target.getBoundingClientRect()
  const disabled = target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true'
  return !disabled && rect.width > 0 && rect.height > 0
}

function delay(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds))
}

async function postTourEvent(endpoint: TourEndpoint, body: { stepId?: string }) {
  try {
    await fetch(`/api/onboarding/system-tour/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tenantRequestHeaders(),
      },
      body: JSON.stringify(body),
    })
  } catch {
    // Tanitim akisi ekrandaki calismayi kilitlememeli.
  }
}
