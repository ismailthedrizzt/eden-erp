'use client'

/**
 * LogoUploader - Çoklu Logo Yükleme Bileşeni
 * 
 * Şirketler için çoklu logo yönetimi.
 * Birden fazla logo yüklenebilir, biri asıl (primary) olarak seçilir.
 * 
 * @see docs/templates/LogoUploader.md
 */

import { useState, useCallback } from 'react'
import { Upload, X, Star, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export interface Logo {
  id?: string
  dosya_adi: string
  dosya_url?: string
  is_primary: boolean
  yuklenme_tarihi?: string
  dosya?: File
}

interface LogoUploaderProps {
  /** Current logos */
  logolar?: Logo[]
  
  /** Callback when logos change */
  onChange?: (logolar: Logo[]) => void
  
  /** Read only mode */
  readOnly?: boolean
  
  /** Custom upload handler */
  onUpload?: (file: File) => Promise<string | null>
}

export function LogoUploader({
  logolar = [],
  onChange,
  readOnly = false,
  onUpload
}: LogoUploaderProps) {
  const [yükleniyor, setYükleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    setYükleniyor(true)
    setHata(null)

    try {
      // Validate
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Logo dosyası 5MB\'ı geçemez')
      }

      const izinVerilenTipler = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
      if (!izinVerilenTipler.includes(file.type)) {
        throw new Error('Sadece JPG, PNG, GIF ve SVG dosyaları yüklenebilir')
      }

      let dosyaUrl: string | null = null
      if (onUpload) {
        dosyaUrl = await onUpload(file)
      }

      const yeniLogo: Logo = {
        dosya_adi: file.name,
        dosya_url: dosyaUrl || undefined,
        is_primary: logolar.length === 0, // First logo is primary
        yuklenme_tarihi: new Date().toISOString(),
        dosya: onUpload ? undefined : file
      }

      onChange?.([...logolar, yeniLogo])
    } catch (err: any) {
      setHata(err.message)
    } finally {
      setYükleniyor(false)
    }
  }, [logolar, onChange, onUpload])

  const handleRemove = useCallback((index: number) => {
    const yeniLogolar = logolar.filter((_, i) => i !== index)
    
    // If primary was removed, set first remaining as primary
    const eskiPrimary = logolar[index]?.is_primary
    if (eskiPrimary && yeniLogolar.length > 0) {
      yeniLogolar[0].is_primary = true
    }
    
    onChange?.(yeniLogolar)
  }, [logolar, onChange])

  const handleSetPrimary = useCallback((index: number) => {
    const yeniLogolar = logolar.map((logo, i) => ({
      ...logo,
      is_primary: i === index
    }))
    onChange?.(yeniLogolar)
  }, [logolar, onChange])

  const primaryLogo = logolar.find(l => l.is_primary)
  const otherLogos = logolar.filter(l => !l.is_primary)

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Şirket Logoları
      </h4>

      {/* Primary Logo */}
      {primaryLogo && (
        <div className="relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              Asıl Logo
            </span>
          </div>
          
          <div className="flex flex-col items-center">
            {primaryLogo.dosya_url ? (
              <Image
                src={primaryLogo.dosya_url}
                alt="Primary Logo"
                width={120}
                height={120}
                className="object-contain"
              />
            ) : primaryLogo.dosya ? (
              <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-400 text-center p-2">
                {primaryLogo.dosya_adi}
              </div>
            ) : (
              <Building2 className="w-16 h-16 text-blue-400" />
            )}
            
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center truncate max-w-[150px]">
              {primaryLogo.dosya_adi}
            </p>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                const index = logolar.findIndex(l => l.is_primary)
                handleRemove(index)
              }}
              className="absolute top-2 left-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      )}

      {/* Other Logos Grid */}
      {otherLogos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {otherLogos.map((logo, index) => {
            const actualIndex = logolar.findIndex(l => l === logo)
            
            return (
              <div
                key={actualIndex}
                className="relative p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {logo.dosya_url ? (
                  <Image
                    src={logo.dosya_url}
                    alt="Logo"
                    width={60}
                    height={60}
                    className="object-contain mx-auto"
                  />
                ) : logo.dosya ? (
                  <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded mx-auto flex items-center justify-center text-xs text-gray-400 text-center">
                    {logo.dosya_adi.substring(0, 8)}...
                  </div>
                ) : (
                  <Building2 className="w-10 h-10 text-gray-400 mx-auto" />
                )}

                {!readOnly && (
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(actualIndex)}
                      className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded"
                      title="Asıl yap"
                    >
                      <Star className="w-3 h-3 text-yellow-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(actualIndex)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Button */}
      {!readOnly && (
        <label className={cn(
          'flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
          yükleniyor
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/10'
        )}>
          {yükleniyor ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-500">
            {yükleniyor ? 'Yükleniyor...' : 'Logo Ekle'}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.svg"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
              e.target.value = ''
            }}
          />
        </label>
      )}

      {hata && (
        <p className="text-xs text-red-500">
          {hata}
        </p>
      )}

      <p className="text-xs text-gray-400">
        Maksimum 5MB, JPG/PNG/GIF/SVG formatları desteklenir.
        {primaryLogo ? ' Yıldız ikonuna tıklayarak asıl logoyu değiştirebilirsiniz.' : ''}
      </p>
    </div>
  )
}
