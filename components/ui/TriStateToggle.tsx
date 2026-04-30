'use client'

import { cn } from '@/lib/utils'

type TriState = 'on' | 'off' | 'partial'

interface TriStateToggleProps {
  state: TriState
  onChange: (state: TriState) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TriStateToggle({ state, onChange, disabled = false, size = 'md' }: TriStateToggleProps) {
  const sizeClasses = {
    sm: 'w-20 h-5',
    md: 'w-28 h-6',
    lg: 'w-36 h-8'
  }

  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  }

  const handleClick = () => {
    if (disabled) return
    // Cycle: on -> partial -> off -> on
    const nextState: Record<TriState, TriState> = {
      on: 'partial',
      partial: 'off',
      off: 'on'
    }
    onChange(nextState[state])
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative inline-flex rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        sizeClasses[size],
        state === 'on' && 'bg-green-600',
        state === 'off' && 'bg-gray-200 dark:bg-gray-700',
        state === 'partial' && 'bg-yellow-500'
      )}
    >
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <span className={cn('font-medium text-white', textSizeClasses[size], state === 'on' ? 'opacity-100' : 'opacity-50')}>Açık</span>
        <span className={cn('font-medium text-white', textSizeClasses[size], state === 'partial' ? 'opacity-100' : 'opacity-50')}>Kısmi</span>
        <span className={cn('font-medium text-white', textSizeClasses[size], state === 'off' ? 'opacity-100' : 'opacity-50')}>Kapalı</span>
      </div>
      <div
        className={cn(
          'pointer-events-none absolute top-0.5 bottom-0.5 w-1/3 rounded-full bg-white shadow transform transition-all duration-200 ease-in-out',
          state === 'on' && 'left-0.5',
          state === 'partial' && 'left-1/3',
          state === 'off' && 'left-2/3'
        )}
      />
    </button>
  )
}
