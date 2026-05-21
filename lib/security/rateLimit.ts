import 'server-only'

import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const globalBuckets = globalThis as typeof globalThis & {
  __edenRateLimitBuckets?: Map<string, RateLimitBucket>
}

const buckets = globalBuckets.__edenRateLimitBuckets || new Map<string, RateLimitBucket>()
globalBuckets.__edenRateLimitBuckets = buckets

export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

export function rateLimitKey(scope: string, subject: string) {
  const digest = createHash('sha256').update(subject).digest('base64url').slice(0, 24)
  return `${scope}:${digest}`
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    pruneExpiredBuckets(now)
    return { ok: true as const, remaining: options.limit - 1, resetAt: now + options.windowMs }
  }

  if (existing.count >= options.limit) {
    return { ok: false as const, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return { ok: true as const, remaining: options.limit - existing.count, resetAt: existing.resetAt }
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  return NextResponse.json(
    {
      error: 'Cok fazla deneme yapildi. Biraz bekleyip tekrar deneyin.',
      code: 'RATE_LIMITED',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
      },
    }
  )
}

export function enforceRateLimit(
  request: NextRequest,
  scope: string,
  subject: string,
  options: RateLimitOptions
) {
  const ip = clientIp(request)
  const ipResult = checkRateLimit(rateLimitKey(`${scope}:ip`, ip), {
    limit: Math.max(options.limit * 4, options.limit),
    windowMs: options.windowMs,
  })
  if (!ipResult.ok) return rateLimitResponse(ipResult.resetAt)

  const subjectResult = checkRateLimit(rateLimitKey(scope, subject), options)
  if (!subjectResult.ok) return rateLimitResponse(subjectResult.resetAt)

  return null
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 1000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}
