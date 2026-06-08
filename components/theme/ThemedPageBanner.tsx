'use client'

import PageBanner, { type PageBannerProps } from '@/components/ui/PageBanner'
import { cn } from '@/lib/utils'

export function ThemedPageBanner({ className, ...props }: PageBannerProps) {
  return <PageBanner {...props} className={cn('eden-themed-page-banner', className)} />
}
