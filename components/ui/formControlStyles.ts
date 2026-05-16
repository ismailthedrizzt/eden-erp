import { cn } from '@/lib/utils'

export type FormControlState = 'neutral' | 'invalid' | 'valid'

type FormControlClassOptions = {
  state?: FormControlState
  rounded?: 'md' | 'lg'
  size?: 'sm' | 'field' | 'md'
  className?: string
}

export function formControlClass({
  state = 'neutral',
  rounded = 'lg',
  size = 'md',
  className,
}: FormControlClassOptions = {}) {
  return cn(
    'w-full border bg-white text-gray-900 placeholder:text-gray-400 outline-none transition-colors [color-scheme:light] [-webkit-text-fill-color:#111827]',
    'disabled:cursor-not-allowed disabled:bg-white disabled:text-gray-900 disabled:opacity-70 disabled:[-webkit-text-fill-color:#111827]',
    'read-only:cursor-not-allowed read-only:bg-white read-only:text-gray-900 read-only:opacity-70 read-only:[-webkit-text-fill-color:#111827]',
    'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:[color-scheme:dark] dark:[-webkit-text-fill-color:#f3f4f6]',
    'dark:disabled:bg-gray-900 dark:disabled:text-gray-100 dark:disabled:[-webkit-text-fill-color:#f3f4f6]',
    'dark:read-only:bg-gray-900 dark:read-only:text-gray-100 dark:read-only:[-webkit-text-fill-color:#f3f4f6]',
    rounded === 'md' ? 'rounded-md' : 'rounded-lg',
    size === 'sm' ? 'px-2 py-1.5 text-xs' : size === 'field' ? 'px-2.5 py-1.5 text-[13px] leading-5' : 'px-3 py-2 text-sm',
    state === 'invalid'
      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-700'
      : state === 'valid'
        ? 'border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-600'
        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700',
    className
  )
}
