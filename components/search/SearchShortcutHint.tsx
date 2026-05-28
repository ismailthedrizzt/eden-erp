'use client'

export function SearchShortcutHint() {
  return (
    <span className="hidden items-center gap-0.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 sm:inline-flex" aria-hidden="true">
      <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans dark:border-gray-700 dark:bg-eden-navy-3">Ctrl</kbd>
      <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans dark:border-gray-700 dark:bg-eden-navy-3">K</kbd>
    </span>
  )
}
