import { NextResponse } from 'next/server'

export function auditError(message: string, code = 'AUDIT_ERROR', status = 400, details?: Record<string, any>) {
  return NextResponse.json({ error: message, code, details }, { status })
}

export function auditListResponse(data: any[], meta: { page: number; pageSize: number; total: number; totalPages: number }) {
  return NextResponse.json({ data, meta }, { headers: { 'Cache-Control': 'no-store' } })
}
