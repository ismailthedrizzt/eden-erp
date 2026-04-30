'use client'

import { cn } from '@/lib/utils'

type TriState = 'on' | 'off' | 'partial'

interface TriStateToggleProps {
  state: TriState
  onChange: (state: TriState) => void
  disabled?: boolean
}

export function TriStateToggle({ state, onChange, disabled = false }: TriStateToggleProps) {
  return (
    <div className="relative inline-grid grid-cols-3 gap-0.5 rounded-full bg-gray-200 dark:bg-white/10 p-0.5">
      <label className="relative cursor-pointer">
        <input
          type="radio"
          name="tristate"
          value="on"
          checked={state === 'on'}
          onChange={() => onChange('on')}
          disabled={disabled}
          className="peer absolute inset-0 appearance-none"
        />
        <div className={cn(
          'flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-all',
          'peer-checked:bg-green-500 peer-checked:text-white',
          'peer-checked:shadow-sm',
          'text-gray-600 dark:text-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}>
          Açık
        </div>
      </label>

      <label className="relative cursor-pointer">
        <input
          type="radio"
          name="tristate"
          value="partial"
          checked={state === 'partial'}
          onChange={() => onChange('partial')}
          disabled={disabled}
          className="peer absolute inset-0 appearance-none"
        />
        <div className={cn(
          'flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-all',
          'peer-checked:bg-yellow-500 peer-checked:text-white',
          'peer-checked:shadow-sm',
          'text-gray-600 dark:text-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}>
          Kısmi
        </div>
      </label>

      <label className="relative cursor-pointer">
        <input
          type="radio"
          name="tristate"
          value="off"
          checked={state === 'off'}
          onChange={() => onChange('off')}
          disabled={disabled}
          className="peer absolute inset-0 appearance-none"
        />
        <div className={cn(
          'flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-all',
          'peer-checked:bg-red-500 peer-checked:text-white',
          'peer-checked:shadow-sm',
          'text-gray-600 dark:text-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}>
          Kapalı
        </div>
      </label>
    </div>
  )
}
