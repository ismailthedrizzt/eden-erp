'use client'

/**
 * DocumentLoader - Yapılandırılmış Doküman Yükleme Bileşeni
 * 
 * Şirketler için yapılandırılmış evrak yönetimi.
 * Her doküman tipi için yükleme alanı gösterir.
 * Yüklenmemiş zorunlu dokümanlar eksik olarak işaretlenir.
 * 
 * @see docs/templates/DocumentLoader.md
 */

import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, FileImage } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DokumanTipi {
  value: string
  label: string
  required: boolean
  description?: string
}

export interface YüklenenDokuman {
  id?: string
  dokuman_turu: string
  dosya_adi: string
  dosya_url?: string
  yuklenme_tarihi?: string
  dosya?: File  // For new uploads
}

interface DocumentLoaderProps {
  /** Available document types */
  dokumanTipleri: DokumanTipi[]
  
  /** Currently uploaded documents */
  yuklenenDokumanlar?: YüklenenDokuman[]
  
  /** Callback when documents change */
  onChange?: (dokumanlar: YüklenenDokuman[]) => void
  
  /** Read only mode (for view) */
  readOnly?: boolean
  
  /** Custom upload handler */
  onUpload?: (dokumanTuru: string, file: File) => Promise<string | null>
}

export function DocumentLoader({
  dokumanTipleri,
  yuklenenDokumanlar = [],
  onChange,
  readOnly = false,
  onUpload
}: DocumentLoaderProps) {
  const [yükleniyor, setYükleniyor] = useState<string | null>(null)
  const [hatalar, setHatalar] = useState<Record<string, string>>({})

  const getDokumanDurumu = (dokumanTuru: string) => {
    return yuklenenDokumanlar.find(d => d.dokuman_turu === dokumanTuru)
  }

  const isZorunluEksik = (dokumanTuru: string) => {
    const tip = dokumanTipleri.find(t => t.value === dokumanTuru)
    if (!tip?.required) return false
    return !getDokumanDurumu(dokumanTuru)
  }

  const handleFileSelect = useCallback(async (dokumanTuru: string, file: File) => {
    setYükleniyor(dokumanTuru)
    setHatalar(prev => ({ ...prev, [dokumanTuru]: '' }))

    try {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Dosya boyutu 10MB\'ı geçemez')
      }

      const izinVerilenTipler = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      if (!izinVerilenTipler.includes(file.type)) {
        throw new Error('Sadece JPG, PNG, GIF ve PDF dosyaları yüklenebilir')
      }

      let dosyaUrl: string | null = null

      // If custom upload handler provided, use it
      if (onUpload) {
        dosyaUrl = await onUpload(dokumanTuru, file)
      }

      // Create new document entry
      const yeniDokuman: YüklenenDokuman = {
        dokuman_turu: dokumanTuru,
        dosya_adi: file.name,
        dosya_url: dosyaUrl || undefined,
        yuklenme_tarihi: new Date().toISOString(),
        dosya: onUpload ? undefined : file  // Keep file only if not uploaded yet
      }

      // Update documents list
      const güncelDokumanlar = yuklenenDokumanlar.filter(
        d => d.dokuman_turu !== dokumanTuru
      )
      güncelDokumanlar.push(yeniDokuman)

      onChange?.(güncelDokumanlar)
    } catch (err: any) {
      setHatalar(prev => ({ ...prev, [dokumanTuru]: err.message }))
    } finally {
      setYükleniyor(null)
    }
  }, [yuklenenDokumanlar, onChange, onUpload])

  const handleRemove = useCallback((dokumanTuru: string) => {
    const güncelDokumanlar = yuklenenDokumanlar.filter(
      d => d.dokuman_turu !== dokumanTuru
    )
    onChange?.(güncelDokumanlar)
  }, [yuklenenDokumanlar, onChange])

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Yapılandırılmış Evraklar
      </h4>
      
      <div className="space-y-2">
        {dokumanTipleri.map((tip) => {
          const dokuman = getDokumanDurumu(tip.value)
          const eksik = isZorunluEksik(tip.value)
          const yukleniyorBu = yükleniyor === tip.value
          const hata = hatalar[tip.value]

          return (
            <div
              key={tip.value}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all',
                eksik 
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                  : dokuman
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
                !readOnly && !dokuman && 'hover:border-blue-300 dark:hover:border-blue-700'
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {dokuman ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : eksik ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <FileText className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    eksik ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                  )}>
                    {tip.label}
                  </span>
                  {tip.required && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                </div>
                
                {dokuman ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {dokuman.dosya_adi}
                  </p>
                ) : eksik ? (
                  <p className="text-xs text-red-500">
                    Zorunlu doküman eksik
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    İsteğe bağlı
                  </p>
                )}
                
                {hata && (
                  <p className="text-xs text-red-500 mt-1">
                    {hata}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {yukleniyorBu ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : dokuman ? (
                  <>
                    {/* Preview button */}
                    {dokuman.dosya_url && (
                      <a
                        href={dokuman.dosya_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="Görüntüle"
                      >
                        <FileImage className="w-4 h-4 text-gray-500" />
                      </a>
                    )}
                    
                    {/* Remove button */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemove(tip.value)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Kaldır"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </>
                ) : (
                  /* Upload button */
                  !readOnly && (
                    <label className="cursor-pointer p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-md transition-colors">
                      <Upload className="w-4 h-4 text-blue-500" />
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect(tip.value, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
        <span>
          {yuklenenDokumanlar.length} / {dokumanTipleri.length} doküman yüklendi
        </span>
        {dokumanTipleri.some(t => t.required && isZorunluEksik(t.value)) && (
          <span className="text-red-500">
            Zorunlu dokümanlar eksik
          </span>
        )}
      </div>
    </div>
  )
}
