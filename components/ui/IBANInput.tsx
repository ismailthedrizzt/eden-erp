'use client'

import { Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formControlClass } from './formControlStyles'

interface IBANInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function IBANInput({ value, onChange, disabled = false, className }: IBANInputProps) {
  const formatIBAN = (iban: string) => {
    const cleaned = iban.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    return cleaned.replace(/(.{4})/g, '$1 ').trim()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    onChange(formatIBAN(cleaned))
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="TR00 0000 0000 0000 0000 0000 00"
        maxLength={42}
        className={cn(
          formControlClass({ rounded: 'md', className: 'pl-10' }),
          className
        )}
      />
      <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
    </div>
  )
}
