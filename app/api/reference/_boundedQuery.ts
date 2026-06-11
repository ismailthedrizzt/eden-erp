import { NextResponse } from 'next/server'

export function wantsFullReferencePayload(searchParams: URLSearchParams) {
  return searchParams.get('full') === 'true'
    || searchParams.get('all') === 'true'
    || searchParams.get('payload') === 'full'
}

export function referenceQueryRequiredResponse(searchParams: URLSearchParams) {
  const query = (searchParams.get('q') || searchParams.get('query') || searchParams.get('search') || '').trim()
  const category = (searchParams.get('category') || '').trim()
  if (query || category || wantsFullReferencePayload(searchParams)) return null

  return NextResponse.json(
    {
      error: 'Reference query is required for this endpoint.',
      code: 'REFERENCE_QUERY_REQUIRED',
    },
    { status: 400, headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}
