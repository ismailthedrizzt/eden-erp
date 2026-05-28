'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { onboardingService, type OnboardingOverview } from '@/lib/services/onboarding'
import { FirstRunWelcome } from './FirstRunWelcome'

type FirstRunExperienceProps = {
  onStartSystemTour?: () => void
}

export function FirstRunExperience({ onStartSystemTour }: FirstRunExperienceProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [overview, setOverview] = useState<OnboardingOverview | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    onboardingService.getWorkspace()
      .then(result => {
        if (cancelled) return
        setOverview(result)
        setOpen(Boolean(result.should_show_welcome) && !pathname.startsWith('/app/onboarding'))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [pathname])

  async function markWelcomeSeen() {
    await onboardingService.dismissHint('first-run-welcome').catch(() => undefined)
    await onboardingService.completeWorkspaceStep('welcome').catch(() => undefined)
  }

  async function startSetup() {
    setBusy(true)
    await markWelcomeSeen()
    setOpen(false)
    router.push('/app/onboarding')
  }

  async function startTour() {
    setBusy(true)
    await markWelcomeSeen()
    setOpen(false)
    onStartSystemTour?.()
  }

  async function postpone() {
    setBusy(true)
    await onboardingService.dismissHint('first-run-welcome').catch(() => undefined)
    setOpen(false)
    setBusy(false)
  }

  async function openHelp() {
    setBusy(true)
    await markWelcomeSeen()
    setOpen(false)
    router.push('/app/onboarding?help=1')
  }

  return (
    <FirstRunWelcome
      open={open}
      overview={overview}
      busy={busy}
      onStartSetup={startSetup}
      onStartTour={startTour}
      onPostpone={postpone}
      onHelp={openHelp}
    />
  )
}
