import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'red' | 'gold' | 'gray'
  className?: string
}

const COLORS = {
  blue:  'border-t-eden-blue',
  green: 'border-t-eden-green',
  red:   'border-t-red-500',
  gold:  'border-t-eden-gold',
  gray:  'border-t-gray-300',
}

const VAL_COLORS = {
  blue:  'text-eden-blue',
  green: 'text-eden-green',
  red:   'text-red-600',
  gold:  'text-amber-600',
  gray:  'text-gray-600',
}

export default function KpiCard({ label, value, sub, color = 'blue', className }: KpiCardProps) {
  return (
    <div className={cn('kpi-card', COLORS[color], className)}>
      <div className="kpi-label">{label}</div>
      <div className={cn('kpi-value', VAL_COLORS[color])}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
