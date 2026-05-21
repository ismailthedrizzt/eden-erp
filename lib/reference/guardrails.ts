import { NextResponse } from 'next/server'

export function wantsFullReferencePayload(searchParams: URLSearchParams) {
  const value = searchParams.get('full') || searchParams.get('all')
  return value === '1' || value === 'true'
}

export function referenceQueryRequiredResponse(referenceName: string) {
  return NextResponse.json(
    {
      error: `${referenceName} listesi tam olarak istemciye gönderilmez. q, limit, scope veya province parametresi kullanın.`,
      code: 'REFERENCE_QUERY_REQUIRED',
    },
    { status: 400 }
  )
}

export function hasAnyReferenceSelector(searchParams: URLSearchParams, selectors: string[] = ['q', 'limit']) {
  return selectors.some(selector => searchParams.has(selector))
}
