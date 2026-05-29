'use client'

import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DemoModeBadge({ className }: { className?: string }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  return (
    <Link
      href="/app/sistem"
      className={cn(
        'hidden items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-normal text-amber-800 shadow-sm transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 md:inline-flex',
        className
      )}
      title="Demo ortami: veriler gercek musteri verisi degildir"
    >
      <FlaskConical size={12} />
      Demo Ortami
    </Link>
  )
}

