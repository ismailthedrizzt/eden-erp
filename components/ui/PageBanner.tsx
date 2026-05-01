'use client'

/**
 * PageBanner - ERP Page Header Component
 * 
 * Standardized page header that adapts based on page state.
 * 
 * Architecture:
 * - List Mode: Shows "Add" button to create new records
 * - Form Mode: Shows "Back" button to return to list
 * 
 * This prevents recursive UI loops (Form → Add → Form → Add...)
 * 
 * @example
 * // List Page
 * <PageBanner
 *   mode="list"
 *   title="Çalışanlar"
 *   icon={<Users size={24} />}
 *   onAddClick={() => setPageState('create')}
 * />
 * 
 * // Form Page
 * <PageBanner
 *   mode="form"
 *   title="Yeni Çalışan"
 *   subtitle="Kayıt oluşturun"
 *   icon={<UserPlus size={24} />}
 *   onBackClick={() => setPageState('list')}
 * />
 */

import { Plus, ArrowLeft, UserPlus, User, Edit3, Eye } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Page mode - determines button behavior */
export type PageBannerMode = 'list' | 'form'

/** Form sub-mode for displaying appropriate icon/title */
export type FormSubMode = 'create' | 'view' | 'edit'

export interface PageBannerProps {
  /** Page mode - determines which button to show */
  mode: PageBannerMode
  
  /** Page title */
  title: string
  
  /** Page subtitle */
  subtitle?: string
  
  /** Icon component (usually Lucide icon) */
  icon?: ReactNode
  
  /** Form sub-mode (for icon selection when mode='form') */
  formMode?: FormSubMode
  
  /** Click handler for Add button (list mode) */
  onAddClick?: () => void
  
  /** Click handler for Back button (form mode) */
  onBackClick?: () => void
  
  /** Add button text (list mode) */
  addButtonText?: string
  
  /** Back button text (form mode) */
  backButtonText?: string
  
  /** Custom button icon */
  customButtonIcon?: ReactNode
  
  /** Additional CSS classes */
  className?: string
}

export function PageBanner({
  mode,
  title,
  subtitle,
  icon,
  formMode = 'create',
  onAddClick,
  onBackClick,
  addButtonText = 'Ekle',
  backButtonText = 'Geri',
  customButtonIcon,
  className
}: PageBannerProps) {
  // Select appropriate icon for form mode if not provided
  const defaultIcon = () => {
    if (mode === 'form') {
      switch (formMode) {
        case 'create': return <UserPlus size={24} />
        case 'edit': return <Edit3 size={24} />
        case 'view': return <User size={24} />
        default: return <User size={24} />
      }
    }
    return icon || <Plus size={24} />
  }

  return (
    <div className={cn(
      "bg-gradient-to-r from-eden-blue to-eden-blue-dk rounded-xl p-4 sm:p-6 mb-6 text-white",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            {icon || defaultIcon()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold font-display truncate">{title}</h1>
            {subtitle && (
              <p className="text-eden-blue-lt mt-1 text-sm hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* List Mode: Add Button */}
        {mode === 'list' && onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            {customButtonIcon || <Plus size={16} />}
            {addButtonText}
          </button>
        )}

        {/* Form Mode: Back Button */}
        {mode === 'form' && onBackClick && (
          <button
            onClick={onBackClick}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
          >
            {customButtonIcon || <ArrowLeft size={16} />}
            {backButtonText}
          </button>
        )}
      </div>
    </div>
  )
}

export default PageBanner
