export function isMissingTableError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || message.includes('Could not find the table')
    || message.includes('schema cache')
    || message.includes('does not exist')
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  const message = (error as any)?.message
  return typeof message === 'string' && message ? message : fallback
}
