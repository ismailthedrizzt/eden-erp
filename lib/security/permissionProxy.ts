import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function requirePermissionForProxy(
  request: NextRequest,
  permissionKey: string
) {
  const result = await requirePermission(request, createServiceClient(), permissionKey)
  return result instanceof NextResponse ? result : null
}
