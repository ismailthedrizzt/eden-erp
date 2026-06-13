// BACKEND_MIGRATION_STATUS: deprecated_compatibility_adapter
// CANONICAL_BACKEND: Compatibility wrapper
// TARGET_FASTAPI_ENDPOINT: none
// CANONICAL_REPLACEMENT: /api/entity-bank-accounts/{id}/history
// RELEASE_VISIBILITY: not release-visible; no current caller found in frontend/service scan
// DELETION_CONDITION: remove after telemetry/caller audit confirms zero usage
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ data: [], message: 'Hesap/kart geçmişi audit altyapısına bağlanmak üzere hazır.' })
}
