'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

// Modal genişlikleri %50 artırıldı
const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  '3xl': 'max-w-[90rem]'
}

export default function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={cn(
        'bg-white dark:bg-eden-navy-2 rounded-t-2xl shadow-2xl w-full max-h-[92dvh] flex flex-col sm:rounded-2xl sm:max-h-[92vh]',
        SIZES[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sm:px-6">
          <h2 className="text-lg font-bold leading-7 tracking-normal text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors sm:h-7 sm:w-7"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex flex-col-reverse gap-2 px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
