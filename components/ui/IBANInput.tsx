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

// Turkish bank code mapping (first 5 digits after country code)
const TURKISH_BANKS: Record<string, { name: string; branch: string }> = {
  '00001': { name: 'Ziraat Bankası', branch: 'Merkez Şube' },
  '00002': { name: 'Halkbank', branch: 'Merkez Şube' },
  '00003': { name: 'Vakıfbank', branch: 'Merkez Şube' },
  '00004': { name: 'Akbank', branch: 'Merkez Şube' },
  '00005': { name: 'Garanti BBVA', branch: 'Merkez Şube' },
  '00006': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00007': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00008': { name: 'HSBC Bank', branch: 'Merkez Şube' },
  '00009': { name: 'TEB', branch: 'Merkez Şube' },
  '00010': { name: 'ING Bank', branch: 'Merkez Şube' },
  '00011': { name: 'Denizbank', branch: 'Merkez Şube' },
  '00012': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00013': { name: 'Şekerbank', branch: 'Merkez Şube' },
  '00014': { name: 'Odeabank', branch: 'Merkez Şube' },
  '00046': { name: 'Kuveyt Türk', branch: 'Merkez Şube' },
  '00059': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00064': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00067': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00071': { name: 'TEB', branch: 'Merkez Şube' },
  '00089': { name: 'Akbank', branch: 'Merkez Şube' },
  '00111': { name: 'Ziraat Bankası', branch: 'Merkez Şube' },
  '00123': { name: 'Halkbank', branch: 'Merkez Şube' },
  '00124': { name: 'Vakıfbank', branch: 'Merkez Şube' },
  '00154': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00159': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00167': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00201': { name: 'Garanti BBVA', branch: 'Merkez Şube' },
  '00206': { name: 'Akbank', branch: 'Merkez Şube' },
  '00211': { name: 'Denizbank', branch: 'Merkez Şube' },
  '00234': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00235': { name: 'TEB', branch: 'Merkez Şube' },
  '00241': { name: 'ING Bank', branch: 'Merkez Şube' },
  '00245': { name: 'Şekerbank', branch: 'Merkez Şube' },
  '00246': { name: 'Odeabank', branch: 'Merkez Şube' },
  '00259': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00267': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00301': { name: 'Ziraat Bankası', branch: 'Merkez Şube' },
  '00302': { name: 'Halkbank', branch: 'Merkez Şube' },
  '00303': { name: 'Vakıfbank', branch: 'Merkez Şube' },
  '00304': { name: 'Akbank', branch: 'Merkez Şube' },
  '00305': { name: 'Garanti BBVA', branch: 'Merkez Şube' },
  '00306': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00307': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00308': { name: 'HSBC Bank', branch: 'Merkez Şube' },
  '00309': { name: 'TEB', branch: 'Merkez Şube' },
  '00310': { name: 'ING Bank', branch: 'Merkez Şube' },
  '00311': { name: 'Denizbank', branch: 'Merkez Şube' },
  '00312': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00313': { name: 'Şekerbank', branch: 'Merkez Şube' },
  '00314': { name: 'Odeabank', branch: 'Merkez Şube' },
  '00315': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00346': { name: 'Kuveyt Türk', branch: 'Merkez Şube' },
  '00359': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00364': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00367': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00371': { name: 'TEB', branch: 'Merkez Şube' },
  '00389': { name: 'Akbank', branch: 'Merkez Şube' },
  '00401': { name: 'Ziraat Bankası', branch: 'Merkez Şube' },
  '00402': { name: 'Halkbank', branch: 'Merkez Şube' },
  '00403': { name: 'Vakıfbank', branch: 'Merkez Şube' },
  '00404': { name: 'Akbank', branch: 'Merkez Şube' },
  '00405': { name: 'Garanti BBVA', branch: 'Merkez Şube' },
  '00406': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00407': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00408': { name: 'HSBC Bank', branch: 'Merkez Şube' },
  '00409': { name: 'TEB', branch: 'Merkez Şube' },
  '00410': { name: 'ING Bank', branch: 'Merkez Şube' },
  '00411': { name: 'Denizbank', branch: 'Merkez Şube' },
  '00412': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00413': { name: 'Şekerbank', branch: 'Merkez Şube' },
  '00414': { name: 'Odeabank', branch: 'Merkez Şube' },
  '00415': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00446': { name: 'Kuveyt Türk', branch: 'Merkez Şube' },
  '00459': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00464': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00467': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00471': { name: 'TEB', branch: 'Merkez Şube' },
  '00489': { name: 'Akbank', branch: 'Merkez Şube' },
  '00501': { name: 'Ziraat Bankası', branch: 'Merkez Şube' },
  '00502': { name: 'Halkbank', branch: 'Merkez Şube' },
  '00503': { name: 'Vakıfbank', branch: 'Merkez Şube' },
  '00504': { name: 'Akbank', branch: 'Merkez Şube' },
  '00505': { name: 'Garanti BBVA', branch: 'Merkez Şube' },
  '00506': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00507': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00508': { name: 'HSBC Bank', branch: 'Merkez Şube' },
  '00509': { name: 'TEB', branch: 'Merkez Şube' },
  '00510': { name: 'ING Bank', branch: 'Merkez Şube' },
  '00511': { name: 'Denizbank', branch: 'Merkez Şube' },
  '00512': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00513': { name: 'Şekerbank', branch: 'Merkez Şube' },
  '00514': { name: 'Odeabank', branch: 'Merkez Şube' },
  '00515': { name: 'QNB Finansbank', branch: 'Merkez Şube' },
  '00546': { name: 'Kuveyt Türk', branch: 'Merkez Şube' },
  '00559': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00564': { name: 'Türkiye İş Bankası', branch: 'Merkez Şube' },
  '00567': { name: 'Yapı Kredi Bankası', branch: 'Merkez Şube' },
  '00571': { name: 'TEB', branch: 'Merkez Şube' },
  '00589': { name: 'Akbank', branch: 'Merkez Şube' },
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
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white",
              bankInfo.bankName === 'Bilinmeyen Banka' ? "bg-amber-500" : "bg-[#003b79]"
            )}
          >
            {bankInfo.logoText}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              Banka
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {bankInfo.branchConfidence === 'known' ? bankInfo.branchName : 'Şube bilgisi IBAN standardından güvenilir çıkarılamaz'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
