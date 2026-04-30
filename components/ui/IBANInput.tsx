'use client'

import { useState, useEffect } from 'react'
import { Landmark, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IBANInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function IBANInput({ value, onChange, disabled = false, className }: IBANInputProps) {
  const [bankInfo, setBankInfo] = useState<{ bankName: string; branchName: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Format IBAN for display
  const formatIBAN = (iban: string) => {
    const cleaned = iban.replace(/\s/g, '').toUpperCase()
    return cleaned.replace(/(.{4})/g, '$1 ').trim()
  }

  // Get bank code from IBAN (first 5 characters after country code)
  const getBankCode = (iban: string) => {
    const cleaned = iban.replace(/\s/g, '').toUpperCase()
    if (cleaned.length >= 9) {
      return cleaned.substring(4, 9)
    }
    return null
  }

  // Fetch bank info from openiban API
  useEffect(() => {
    const bankCode = getBankCode(value)
    if (bankCode && bankCode.length === 5) {
      setLoading(true)
      fetch(`https://openiban.com/validate/${value}?getBIC=true`)
        .then(res => res.json())
        .then(data => {
          if (data.valid && data.bankData) {
            setBankInfo({
              bankName: data.bankData.name || 'Bilinmeyen Banka',
              branchName: data.bankData.branch || 'Merkez Şube'
            })
          } else {
            setBankInfo(null)
          }
        })
        .catch(() => setBankInfo(null))
        .finally(() => setLoading(false))
    } else {
      setBankInfo(null)
    }
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
      
      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
          Banka bilgisi alınıyor...
        </div>
      )}
      
      {bankInfo && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <Building2 size={16} className="text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              {bankInfo.bankName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {bankInfo.branchName}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
