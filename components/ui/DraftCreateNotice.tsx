'use client'

export function DraftCreateNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
      <div className="font-semibold">Taslak kayıt</div>
      <div className="mt-1 leading-5">{message}</div>
    </div>
  )
}
