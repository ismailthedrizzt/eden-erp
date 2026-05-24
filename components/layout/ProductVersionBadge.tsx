import { cn } from '@/lib/utils'
import {
  formatVersionBadge,
  getMaturityBadgeClass,
  getMaturityLabel,
  getRoadmapStageLabel,
  productVersionManifest,
} from '@/lib/product/versionManifest'

interface ProductVersionBadgeProps {
  compact?: boolean
  className?: string
}

export function ProductVersionBadge({ compact = false, className }: ProductVersionBadgeProps) {
  const product = productVersionManifest.product
  const badgeText = formatVersionBadge(product.version, product.maturity)
  const title = [
    `${product.name} ${product.version}`,
    getMaturityLabel(product.maturity),
    getRoadmapStageLabel(product.roadmapStage),
    product.label,
  ].join(' · ')

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        getMaturityBadgeClass(product.maturity),
        'max-w-[180px] gap-1.5 px-2 py-1 text-[11px] leading-none',
        className,
      )}
    >
      {!compact && <span className="hidden truncate font-semibold sm:inline">{product.name}</span>}
      <span className="shrink-0">{badgeText}</span>
    </span>
  )
}
