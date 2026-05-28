'use client'

import { useEffect, useState } from 'react'
import { Command, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommandPalette } from './CommandPalette'
import { SearchShortcutHint } from './SearchShortcutHint'

type GlobalSearchInputProps = {
  className?: string
}

export function GlobalSearchInput({ className }: GlobalSearchInputProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  return (
    <>
      <div data-tour-id="global-search" className={cn('min-w-0 flex-1 md:max-w-xl', className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-500 transition hover:border-eden-blue hover:bg-gray-50 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-300 dark:hover:border-sky-500 dark:hover:bg-eden-navy-3 md:flex"
          aria-label="Global aramayi ac"
        >
          <Search size={15} className="shrink-0 text-gray-400" />
          <span className="min-w-0 flex-1 truncate">Sirket, sube, gorev veya belge ara...</span>
          <SearchShortcutHint />
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-200 dark:hover:bg-eden-navy-3 md:hidden"
          aria-label="Global aramayi ac"
        >
          <Command size={16} />
        </button>
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  )
}
