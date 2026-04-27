import { cn } from '@/lib/utils'
import { PROJE_RENKLERI } from '@/lib/utils'

export function Badge({ children, variant = 'gray' }: {
  children: React.ReactNode
  variant?: 'green' | 'red' | 'blue' | 'gold' | 'gray'
}) {
  return (
    <span className={cn('badge', `badge-${variant}`)}>{children}</span>
  )
}

export function ProjeBadge({ proje }: { proje: string }) {
  const r = PROJE_RENKLERI[proje] ?? { bg: '#f3f4f6', text: '#374151' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: r.bg, color: r.text }}
    >
      {proje}
    </span>
  )
}

export function DurumBadge({ durum }: { durum: string }) {
  const map: Record<string, { label: string; variant: 'green' | 'blue' | 'gray' | 'red' }> = {
    gorevde:  { label: 'Görevde',  variant: 'green' },
    izinde:   { label: 'İzinde',   variant: 'blue'  },
    ayrilmis: { label: 'Ayrılmış', variant: 'gray'  },
    askida:   { label: 'Askıda',   variant: 'red'   },
    dolu:     { label: 'Dolu',     variant: 'green' },
    acik:     { label: 'Açık',     variant: 'red'   },
    dondurulmus: { label: 'Dondurulmuş', variant: 'gray' },
  }
  const m = map[durum] ?? { label: durum, variant: 'gray' as const }
  return <Badge variant={m.variant}>{m.label}</Badge>
}
