import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ThemeMotifVariant = 'page-banner' | 'content' | 'corner' | 'empty'

interface ThemeMotifProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ThemeMotifVariant
}

export function ThemeMotif({ variant = 'corner', className, ...props }: ThemeMotifProps) {
  return (
    <span
      aria-hidden="true"
      data-theme-motif={variant}
      className={cn('eden-theme-motif pointer-events-none absolute z-0', className)}
      {...props}
    />
  )
}
