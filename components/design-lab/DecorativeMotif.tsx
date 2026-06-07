import type { CSSProperties, ReactNode } from 'react'
import type { ThemeConcept } from './themeConcepts'

type MotifPlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

interface ThemeCornerMotifProps {
  theme: ThemeConcept
  placement?: MotifPlacement
  compact?: boolean
  tone?: 'active' | 'theme'
  className?: string
}

interface MotifSurfaceProps {
  theme: ThemeConcept
  placement?: MotifPlacement
  className?: string
  children: ReactNode
}

export function MotifSurface({ theme, placement = 'top-right', className = '', children }: MotifSurfaceProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <ThemeCornerMotif theme={theme} placement={placement} />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function ThemeCornerMotif({
  theme,
  placement = 'top-right',
  compact = false,
  tone = 'active',
  className = '',
}: ThemeCornerMotifProps) {
  const position = placementClass(placement)
  const themeToneVars = tone === 'theme'
    ? {
        '--dl-accent-primary': theme.colors.accentPrimary,
        '--dl-accent-warm': theme.colors.accentWarm,
        '--dl-success': theme.colors.success,
        '--dl-warning': theme.colors.warning,
        '--dl-border-strong': theme.colors.borderStrong,
      } as CSSProperties
    : {}
  const style: CSSProperties = {
    ...themeToneVars,
    opacity: tone === 'theme' ? theme.motif.opacity.light : 'var(--dl-motif-opacity)',
    width: compact ? 76 : 'var(--dl-motif-corner-size)',
    height: compact ? 76 : 'var(--dl-motif-corner-size)',
    color: 'var(--dl-accent-warm)',
    transform: placementTransform(placement),
  }

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 ${position} ${className}`}
      style={style}
    >
      <MotifSvg theme={theme} />
    </span>
  )
}

function MotifSvg({ theme }: { theme: ThemeConcept }) {
  const strokeWidth = theme.motif.lineWeight

  if (theme.motif.style === 'art_deco_geometry') {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <path d="M16 112V16h96" stroke="currentColor" strokeWidth={strokeWidth} />
        <path d="M28 112V28h72" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.82" />
        <path d="M40 112V40h48" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.58" />
        <path d="M76 16l20 20-20 20-20-20 20-20z" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.72" />
        <path d="M76 26l10 10-10 10-10-10 10-10z" fill="var(--dl-accent-warm)" opacity="0.42" />
        <path d="M16 86h26M16 98h48M86 16v26M98 16v48" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.42" />
      </svg>
    )
  }

  if (theme.motif.style === 'retro_sun') {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <circle cx="96" cy="96" r="44" fill="var(--dl-accent-warm)" opacity="0.22" />
        <circle cx="96" cy="96" r="30" stroke="currentColor" strokeWidth={strokeWidth} />
        <path d="M96 16v38M60 24l15 34M32 52l30 22M18 92h42" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d="M82 54c-14 6-25 15-34 28" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.68" />
        <circle cx="50" cy="84" r="10" fill="var(--dl-accent-primary)" opacity="0.18" />
      </svg>
    )
  }

  if (theme.motif.style === 'botanical_line') {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <path d="M104 14C78 34 66 56 56 102" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d="M78 42c-16-2-26 4-30 16 14 3 25-3 30-16z" fill="var(--dl-accent-primary)" opacity="0.20" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} />
        <path d="M68 68c-18-1-28 7-31 21 16 2 27-6 31-21z" fill="var(--dl-success)" opacity="0.18" stroke="var(--dl-success)" strokeWidth={strokeWidth} />
        <path d="M92 24c7 14 5 27-6 37-8-13-6-26 6-37z" fill="var(--dl-accent-warm)" opacity="0.16" stroke="currentColor" strokeWidth={strokeWidth} />
        <path d="M56 102c17-10 31-12 48-6" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.55" />
      </svg>
    )
  }

  if (theme.motif.style === 'pop_blocks') {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <rect x="70" y="10" width="40" height="40" rx="10" fill="var(--dl-accent-warm)" opacity="0.34" />
        <rect x="82" y="70" width="30" height="30" rx="8" fill="var(--dl-accent-primary)" opacity="0.30" />
        <path d="M48 20l8 16 17 3-13 12 3 17-15-8-15 8 3-17-13-12 17-3 8-16z" fill="var(--dl-warning)" opacity="0.34" />
        <path d="M16 88h48M28 100h36" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        {Array.from({ length: 12 }).map((_, index) => (
          <circle
            key={index}
            cx={18 + (index % 4) * 10}
            cy={18 + Math.floor(index / 4) * 10}
            r="2.2"
            fill="var(--dl-accent-primary)"
            opacity="0.55"
          />
        ))}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
      <path d="M16 104V16h88" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M28 104V28h76" stroke="var(--dl-border-strong)" strokeWidth={strokeWidth} opacity="0.58" />
      <path d="M16 58h46M58 16v46" stroke="var(--dl-border-strong)" strokeWidth={strokeWidth} opacity="0.32" />
      <path d="M16 82h22M82 16v22" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.42" />
    </svg>
  )
}

function placementClass(placement: MotifPlacement) {
  if (placement === 'top-left') return '-left-5 -top-5'
  if (placement === 'bottom-right') return '-bottom-5 -right-5'
  if (placement === 'bottom-left') return '-bottom-5 -left-5'
  return '-right-5 -top-5'
}

function placementTransform(placement: MotifPlacement) {
  if (placement === 'top-left') return 'scaleX(-1)'
  if (placement === 'bottom-right') return 'scaleY(-1)'
  if (placement === 'bottom-left') return 'scale(-1, -1)'
  return undefined
}
