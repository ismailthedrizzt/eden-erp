'use client'

import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ToggleSwitch({ checked, onChange, disabled = false, size = 'md' }: ToggleSwitchProps) {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-8'
  }

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        sizeClasses[size]
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-full' : 'translate-x-0',
          thumbSizeClasses[size]
        )}
      />
    </button>
  )
}
