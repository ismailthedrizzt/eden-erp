import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAnyPermission } from '@/lib/security/serverPermissions'

export async function requireAuditViewPermission(request: NextRequest, supabase: SupabaseClient) {
  const access = await requireAnyPermission(request, supabase, ['audit.view', 'settings.view', 'settings.edit'])
  if (access instanceof NextResponse) return access
  return access
}
