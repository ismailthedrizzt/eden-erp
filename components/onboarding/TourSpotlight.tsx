'use client'

import type { TourTargetRect } from '@/lib/onboarding/types'

interface TourSpotlightProps {
  rect: TourTargetRect | null
  padding?: number
}

export function TourSpotlight({ rect, padding = 10 }: TourSpotlightProps) {
  if (!rect) {
    return <div className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[1px] motion-reduce:backdrop-blur-0" />
  }

  const top = Math.max(8, rect.top - padding)
  const left = Math.max(8, rect.left - padding)
  const width = rect.width + padding * 2
  const height = rect.height + padding * 2

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute rounded-xl border-2 border-emerald-300 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.54),0_0_28px_rgba(16,185,129,0.34)] transition-all duration-200 ease-out motion-reduce:transition-none"
        style={{
          top,
          left,
          width,
          height,
        }}
      />
    </div>
  )
}
