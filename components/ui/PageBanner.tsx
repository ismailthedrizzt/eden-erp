import { Plus } from 'lucide-react'
import { ReactNode } from 'react'

interface PageBannerProps {
  title: string
  subtitle?: string
  icon: ReactNode
  onAddClick?: () => void
  addButtonText?: string
}

export function PageBanner({
  title,
  subtitle,
  icon,
  onAddClick,
  addButtonText = "Ekle"
}: PageBannerProps) {
  return (
    <div className="bg-gradient-to-r from-eden-blue to-eden-blue-dk rounded-xl p-6 mb-6 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">{title}</h1>
            {subtitle && (
              <p className="text-eden-blue-lt mt-1 text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {onAddClick && addButtonText && (
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            {addButtonText}
          </button>
        )}
      </div>
    </div>
  )
}