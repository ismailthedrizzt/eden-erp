'use client'

import { useEffect, useState } from 'react'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PWAStatus() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [offline, setOffline] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)

    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleControllerChange = () => setUpdateReady(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      }
    }
  }, [])

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  if (dismissed || (!offline && !installPrompt && !updateReady)) return null

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-lg dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-100">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-eden-blue-lt p-2 text-eden-blue-dk dark:bg-white/10 dark:text-white">
          {offline ? <WifiOff size={16} /> : updateReady ? <RefreshCw size={16} /> : <Download size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {offline ? 'Çevrimdışı mod' : updateReady ? 'Güncelleme hazır' : 'Eden ERP kurulabilir'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {offline
              ? 'Bağlantı gelene kadar önbellekteki sayfaları kullanabilirsiniz.'
              : updateReady
                ? 'En güncel sürüme geçmek için sayfayı yenileyin.'
                : 'Uygulamayı cihazınıza kurup bağımsız pencere olarak açabilirsiniz.'}
          </p>
          <div className="mt-3 flex gap-2">
            {installPrompt && !offline && !updateReady && (
              <button onClick={installApp} className="btn btn-primary py-1 text-xs">
                Kur
              </button>
            )}
            {updateReady && (
              <button onClick={() => window.location.reload()} className="btn btn-primary py-1 text-xs">
                Yenile
              </button>
            )}
            <button onClick={() => setDismissed(true)} className="btn py-1 text-xs">
              Kapat
            </button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
