import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalHeroSectionProps {
  leftSlot: ReactNode
  children: ReactNode
  message?: ReactNode
  className?: string
  contentClassName?: string
}

export function ModalHeroSection({
  leftSlot,
  children,
  message,
  className,
  contentClassName,
}: ModalHeroSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="w-full lg:w-36">{leftSlot}</div>
        <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 min-w-0', contentClassName)}>{children}</div>
      </div>
      <div className="w-full min-h-4 text-xs lg:pl-40">{message}</div>
    </section>
  )
}
