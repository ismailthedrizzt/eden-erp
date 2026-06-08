import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ThemedContentSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  motif?: 'content' | 'empty' | 'none'
}

export function ThemedContentSurface({ motif = 'content', className, children, ...props }: ThemedContentSurfaceProps) {
  return (
    <div
      data-theme-surface={motif === 'none' ? undefined : motif}
      className={cn('eden-themed-content-surface', className)}
      {...props}
    >
      {children}
    </div>
  )
}
