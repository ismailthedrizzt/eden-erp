'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning'

interface ToastProps {
  type: ToastType
  message: string
  title?: string
  duration?: number
  onClose: () => void
}

export function Toast({ type, title, message, duration = 4500, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <XCircle size={20} className="text-red-500" />,
    warning: <AlertCircle size={20} className="text-yellow-500" />
  }

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex max-w-md items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur transition-all duration-300',
        bgColors[type],
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      )}
    >
      {icons[type]}
      <div className="min-w-0">
        {title && <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>}
        <p className="text-sm text-gray-700 dark:text-gray-200">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(onClose, 300)
        }}
        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X size={16} />
      </button>
    </div>
  )
}
