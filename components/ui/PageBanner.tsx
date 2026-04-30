import { Plus } from 'lucide-react'
import { ReactNode } from 'react'

interface PageBannerProps {
  title: string
  subtitle?: string
  icon: ReactNode
  onAddClick?: () => void
  addButtonText?: string
  showAddIcon?: boolean
  buttonIcon?: ReactNode
}

export function PageBanner({
  title,
  subtitle,
  icon,
  onAddClick,
  addButtonText = "Ekle",
  showAddIcon = true,
  buttonIcon
}: PageBannerProps) {
  return (
    <div className="bg-gradient-to-r from-eden-blue to-eden-blue-dk rounded-xl p-4 sm:p-6 mb-6 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold font-display truncate">{title}</h1>
            {subtitle && (
              <p className="text-eden-blue-lt mt-1 text-sm hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>
        {onAddClick && addButtonText && (
          <button
            onClick={onAddClick}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            {buttonIcon || (showAddIcon && <Plus size={16} />)}
            {addButtonText}
          </button>
        )}
      </div>
    </div>
  )
}