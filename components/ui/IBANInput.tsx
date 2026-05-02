'use client'

import { useState, useEffect } from 'react'
import { Landmark } from 'lucide-react'
import { cn, getIbanBankInfo } from '@/lib/utils'

interface IBANInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function IBANInput({ value, onChange, disabled = false, className }: IBANInputProps) {
  const [bankInfo, setBankInfo] = useState<ReturnType<typeof getIbanBankInfo>>(null)

  // Format IBAN for display
  const formatIBAN = (iban: string) => {
    const cleaned = iban.replace(/\s/g, '').toUpperCase()
    return cleaned.replace(/(.{4})/g, '$1 ').trim()
  }

  // Get bank info from local mapping
  useEffect(() => {
    setBankInfo(getIbanBankInfo(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\s/g, '').toUpperCase()
    onChange(formatIBAN(cleaned))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
          maxLength={32}
          className={cn(
            "w-full border rounded-md px-3 py-2 text-sm pl-10",
            disabled
              ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500",
            className
          )}
        />
        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      </div>
      
      {bankInfo && (
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-md border",
          bankInfo.bankName === 'Bilinmeyen Banka'
            ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        )}>
          <div
            title={bankInfo.bankName}
            className={cn(
              "relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white",
              bankInfo.bankName === 'Bilinmeyen Banka' ? "bg-amber-500" : "bg-[#003b79]"
            )}
          >
            {bankInfo.logoUrl && (
              <img
                src={bankInfo.logoUrl}
                alt=""
                className="absolute h-6 w-6 rounded-sm bg-white object-contain"
                onError={(event) => { event.currentTarget.style.display = 'none' }}
              />
            )}
            {bankInfo.logoText}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              {bankInfo.bankName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {bankInfo.branchConfidence === 'known'
                ? bankInfo.branchName
                : bankInfo.swiftCode
                  ? `SWIFT: ${bankInfo.swiftCode}`
                  : 'Banka kodu açık kaynak listeden çözüldü'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
