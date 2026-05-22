import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { EdenMailError, sendEdenMail } from '@/lib/mail/edenMail'

type PgClient = {
  connect: () => Promise<void>
  end: () => Promise<void>
  query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, any>>; rowCount: number | null }>
}

export const USER_REGISTRATION_ADMIN_ROLE_KEYS = ['super_admin', 'admin', 'yonetici'] as const
export const BASIC_USER_ROLE_KEY = 'kullanici'
export const BASIC_USER_ROLE_NAME = 'Kullanıcı'

const USER_CREATED_MESSAGE = 'Kullanıcınız oluşturulmuştur. Eden ERP tecrübeniz hayırlı olsun.'

let schemaPromise: Promise<void> | null = null

export function normalizeRegistrationEmail(value?: string | null) {
  const email = String(value || '').trim().toLowerCase()
  return email || null
}

export function normalizeRegistrationPhone(value?: string | null) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('90')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits || null
}

export async function ensureUserRegistrationRequestSchema() {
  if (!process.env.DATABASE_URL) return

  schemaPromise ||= applyUserRegistrationRequestSchema().finally(() => {
    schemaPromise = null
  })

  return schemaPromise
}

async function applyUserRegistrationRequestSchema() {
  const { Client } = await import('pg')
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }) as PgClient

  await client.connect()
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS public.user_registration_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES public.erp_instances(id) ON DELETE CASCADE,
        company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        company_tax_number text NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        full_name text,
        nationality text NOT NULL DEFAULT 'TR',
        national_id text NOT NULL,
        gender text,
        email text,
        phone text,
        requested_role_key text NOT NULL DEFAULT 'kullanici',
        status text NOT NULL DEFAULT 'pending',
        created_person_id uuid REFERENCES public.persons(id),
        created_membership_id uuid REFERENCES public.tenant_memberships(id),
        created_user_role_id uuid REFERENCES public.user_roles(id),
        reviewed_by uuid,
        reviewed_at timestamptz,
        approval_notes text,
        rejection_reason text,
        notification_results jsonb NOT NULL DEFAULT '[]'::jsonb,
        metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT user_registration_requests_status_check
          CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        CONSTRAINT user_registration_requests_gender_check
          CHECK (gender IS NULL OR gender IN ('male', 'female'))
      );

      CREATE INDEX IF NOT EXISTS user_registration_requests_tenant_status_idx
        ON public.user_registration_requests(tenant_id, status, created_at DESC);

      CREATE INDEX IF NOT EXISTS user_registration_requests_company_idx
        ON public.user_registration_requests(company_id, status);

      CREATE UNIQUE INDEX IF NOT EXISTS user_registration_requests_pending_identity_uidx
        ON public.user_registration_requests(
          tenant_id,
          lower(COALESCE(email, '')),
          COALESCE(phone, ''),
          COALESCE(national_id, '')
        )
        WHERE status = 'pending';

      INSERT INTO public.roles(role_key, name, status)
      VALUES ('kullanici', 'Kullanıcı', 'active')
      ON CONFLICT (role_key) DO UPDATE
      SET name = EXCLUDED.name,
          status = 'active';

      NOTIFY pgrst, 'reload schema';
    `)
  } finally {
    await client.end()
  }
}

export async function isTenantRegistrationAdmin(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  tenantId: string
) {
  if (process.env.EDEN_LOGIN_DISABLED === 'true') return true
  if (!userId) return false

  const { data: membership, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('role_key,status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)
  if (membership?.role_key && USER_REGISTRATION_ADMIN_ROLE_KEYS.includes(membership.role_key as any)) return true

  const { data: userRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('role:roles(role_key)')
    .eq('instance_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')

  if (roleError) throw new Error(roleError.message)

  return (userRoles || []).some((row: any) =>
    USER_REGISTRATION_ADMIN_ROLE_KEYS.includes(row.role?.role_key)
  )
}

export async function ensureBasicUserRole(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('roles')
    .upsert({
      role_key: BASIC_USER_ROLE_KEY,
      name: BASIC_USER_ROLE_NAME,
      status: 'active',
    }, { onConflict: 'role_key' })
    .select('id, role_key, name')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Temel kullanıcı rolü oluşturulamadı.')
  return data
}

export async function sendUserCreatedNotifications(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    personId: string
    requestId: string
    fullName: string
    email?: string | null
    phone?: string | null
  }
) {
  const results: Array<{ channel: 'email' | 'phone'; status: 'sent' | 'skipped' | 'failed'; detail?: string }> = []
  const email = normalizeRegistrationEmail(input.email)
  const phone = normalizeRegistrationPhone(input.phone)

  if (email) {
    try {
      await sendEdenMail({
        to: email,
        subject: 'Eden ERP kullanıcı kaydınız oluşturuldu',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
            <h2 style="margin:0 0 12px">Eden ERP</h2>
            <p>Merhaba ${escapeHtml(input.fullName || 'değerli kullanıcı')},</p>
            <p>${USER_CREATED_MESSAGE}</p>
          </div>
        `,
      })
      results.push({ channel: 'email', status: 'sent' })
    } catch (error) {
      results.push({
        channel: 'email',
        status: 'failed',
        detail: error instanceof EdenMailError ? error.message : error instanceof Error ? error.message : 'E-posta gönderilemedi.',
      })
    }
  } else {
    results.push({ channel: 'email', status: 'skipped', detail: 'E-posta adresi yok.' })
  }

  if (phone) {
    const smsUrl = process.env.EDEN_SMS_API_URL
    if (smsUrl) {
      try {
        await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.EDEN_SMS_API_KEY ? { 'x-api-key': process.env.EDEN_SMS_API_KEY } : {}),
          },
          body: JSON.stringify({
            to: phone,
            message: USER_CREATED_MESSAGE,
          }),
        })
        results.push({ channel: 'phone', status: 'sent' })
      } catch (error) {
        results.push({
          channel: 'phone',
          status: 'failed',
          detail: error instanceof Error ? error.message : 'Telefon mesajı gönderilemedi.',
        })
      }
    } else {
      results.push({ channel: 'phone', status: 'skipped', detail: 'EDEN_SMS_API_URL tanımlı değil.' })
    }
  } else {
    results.push({ channel: 'phone', status: 'skipped', detail: 'Telefon numarası yok.' })
  }

  await logNotificationResults(supabase, input, results)
  return results
}

async function logNotificationResults(
  supabase: SupabaseClient,
  input: { tenantId: string; personId: string; requestId: string },
  results: Array<Record<string, unknown>>
) {
  try {
    await supabase
      .from('system_event_logs')
      .insert({
        workspace_id: input.tenantId,
        actor_user_id: input.personId,
        event_type: 'user_registration.created_notification',
        metadata: {
          request_id: input.requestId,
          results,
        },
      })
  } catch {
    // Notification audit should not block user creation.
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
