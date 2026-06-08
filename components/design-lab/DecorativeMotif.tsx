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
  const style: CSSProperties = {
    ...(tone === 'theme' ? {
      '--dl-accent-primary': theme.colors.accentPrimary,
      '--dl-accent-warm': theme.colors.accentWarm,
      '--dl-success': theme.colors.success,
      '--dl-warning': theme.colors.warning,
      '--dl-border-strong': theme.colors.borderStrong,
    } as CSSProperties : {}),
    opacity: tone === 'theme' ? theme.motif.opacity.light : 'var(--dl-motif-opacity)',
    width: compact ? 80 : 'var(--dl-motif-corner-size)',
    height: compact ? 80 : 'var(--dl-motif-corner-size)',
    color: 'var(--dl-accent-warm)',
    transform: placementTransform(placement),
  }

  return (
    <span aria-hidden="true" className={`pointer-events-none absolute z-0 ${placementClass(placement)} ${className}`} style={style}>
      <MotifSvg theme={theme} />
    </span>
  )
}

function MotifSvg({ theme }: { theme: ThemeConcept }) {
  const strokeWidth = theme.motif.lineWeight
  if (theme.motif.style === 'medrese_geometry') return (
    <svg viewBox="0 0 140 140" className="h-full w-full" fill="none">
      <path d="M18 122V18h104v104" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M70 22l13 31 33 4-25 22 7 33-28-17-28 17 7-33-25-22 33-4 13-31z" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.75" />
      <path d="M38 122c0-25 14-41 32-41s32 16 32 41" stroke="var(--dl-accent-warm)" strokeWidth={strokeWidth} opacity="0.7" />
      <path d="M18 70h104M70 18v104" stroke="var(--dl-border-strong)" strokeWidth={strokeWidth} opacity="0.35" />
    </svg>
  )
  if (theme.motif.style === 'steppe_horizon') return (
    <svg viewBox="0 0 140 140" className="h-full w-full" fill="none">
      <circle cx="104" cy="44" r="24" fill="var(--dl-accent-warm)" opacity="0.24" />
      <path d="M12 88c28-16 54-16 82 0 14 8 24 9 34 5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M16 104c26-9 48-9 74 0 16 6 28 5 40-2M24 118h88" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.55" />
      <path d="M104 12v18M74 24l14 14M130 24l-14 14" stroke="var(--dl-accent-warm)" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.72" />
    </svg>
  )
  if (theme.motif.style === 'equality_rings') return (
    <svg viewBox="0 0 140 140" className="h-full w-full" fill="none">
      <circle cx="86" cy="54" r="32" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="54" cy="76" r="30" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.72" />
      <circle cx="98" cy="96" r="24" stroke="var(--dl-accent-warm)" strokeWidth={strokeWidth} opacity="0.65" />
      <path d="M20 112c28-26 54-28 82-10 11 7 20 7 28-1" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.45" />
    </svg>
  )
  if (theme.motif.style === 'botanical_line') return (
    <svg viewBox="0 0 140 140" className="h-full w-full" fill="none">
      <path d="M118 18C86 44 68 78 58 126" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M86 48c-18-4-33 3-40 18 17 5 31-2 40-18z" fill="var(--dl-accent-primary)" opacity="0.18" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} />
      <path d="M74 82c-20-2-34 8-39 25 19 3 32-7 39-25z" fill="var(--dl-success)" opacity="0.17" stroke="var(--dl-success)" strokeWidth={strokeWidth} />
      <path d="M104 28c10 18 7 34-8 47-10-17-7-33 8-47z" fill="var(--dl-accent-warm)" opacity="0.14" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  )
  if (theme.motif.style === 'atlas_deco') return (
    <svg viewBox="0 0 140 140" className="h-full w-full" fill="none">
      <path d="M18 124V40M38 124V26M58 124V54M78 124V32M102 124V18M122 124V48" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M14 124h112M20 98h102M30 76h82" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.55" />
      <path d="M70 16c22 18 34 42 34 72M70 16c-22 18-34 42-34 72" stroke="var(--dl-accent-warm)" strokeWidth={strokeWidth} opacity="0.62" />
      <path d="M16 112c24-8 45-8 68 0 18 6 32 5 44-2" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.36" />
    </svg>
  )
  return (
    <svg viewBox="0 0 140 140" className="h-full w-full" fill="none">
      <path d="M18 24h72M18 54h104M18 84h62M18 114h104M24 18v104M54 18v72M84 18v104M114 38v84" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.58" />
      <rect x="90" y="18" width="32" height="26" fill="var(--dl-accent-warm)" opacity="0.32" />
      <rect x="32" y="70" width="42" height="24" fill="var(--dl-accent-primary)" opacity="0.22" />
      <path d="M18 120l102-98" stroke="var(--dl-accent-primary)" strokeWidth={strokeWidth} opacity="0.55" />
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
