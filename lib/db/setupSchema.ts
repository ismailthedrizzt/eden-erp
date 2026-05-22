import 'server-only'

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

type PgClient = {
  connect: () => Promise<void>
  end: () => Promise<void>
  query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, any>>; rowCount: number | null }>
}

const REQUIRED_BASE_TABLES = ['erp_instances', 'companies', 'persons', 'organizations', 'roles', 'permissions', 'user_roles']
const REQUIRED_TENANT_TABLES = ['tenant_database_bindings', 'tenant_company_scopes', 'tenant_memberships', 'instance_modules']
const REQUIRED_TENANT_COLUMNS = ['companies', 'persons', 'organizations', 'company_partners', 'employees']
const TENANT_FOUNDATION_MIGRATION = '20260518_tenant_foundation.sql'
const ROLE_MASTER_TENANT_SAFE_MIGRATION = '20260522_role_master_tenant_safe.sql'
const GLOBAL_COMPANY_IDENTITY_MIGRATION = '20260522_global_company_identity.sql'

let setupSchemaPromise: Promise<void> | null = null

export function ensureSetupDatabaseSchema() {
  setupSchemaPromise ||= applySetupDatabaseSchema().finally(() => {
    setupSchemaPromise = null
  })
  return setupSchemaPromise
}

async function applySetupDatabaseSchema() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL tanımlı değil. Kurulum veritabanı tablolarını oluşturamıyor.')
  }

  const { Client } = await import('pg')
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  }) as PgClient

  await client.connect()
  try {
    const publicTables = await listPublicTables(client)
    const readiness = await getSchemaReadiness(client)

    if (readiness.baseReady && readiness.tenantReady && readiness.tenantColumnsReady && readiness.roleMasterReady && readiness.globalCompanyIdentityReady) {
      await reloadPostgrestSchema(client)
      return
    }

    await ensureMigrationTable(client)

    if (!readiness.baseReady) {
      if (publicTables.length > 0) {
        throw new Error('Veritabanı şeması eksik görünüyor. Mevcut tablolar bulunduğu için otomatik sıfırdan kurulum yapılmadı.')
      }

      await applyPendingMigrations(client)
    } else if (!readiness.tenantReady || !readiness.tenantColumnsReady) {
      await applyMigration(client, TENANT_FOUNDATION_MIGRATION, { force: true })
    } else if (!readiness.roleMasterReady) {
      await applyMigration(client, ROLE_MASTER_TENANT_SAFE_MIGRATION, { force: true })
    } else if (!readiness.globalCompanyIdentityReady) {
      await applyMigration(client, GLOBAL_COMPANY_IDENTITY_MIGRATION, { force: true })
    }

    await reloadPostgrestSchema(client)
  } finally {
    await client.end()
  }
}

async function getSchemaReadiness(client: PgClient) {
  const [tables, tenantColumns, roleMasterStatus, globalCompanyIdentityStatus] = await Promise.all([
    listPublicTables(client),
    client.query(
      `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1)
          AND column_name = 'tenant_id'
      `,
      [REQUIRED_TENANT_COLUMNS]
    ),
    getRoleMasterReadiness(client),
    getGlobalCompanyIdentityReadiness(client),
  ])

  const tableSet = new Set(tables)
  const tenantColumnTables = new Set(tenantColumns.rows.map(row => row.table_name))

  return {
    baseReady: REQUIRED_BASE_TABLES.every(table => tableSet.has(table)),
    tenantReady: REQUIRED_TENANT_TABLES.every(table => tableSet.has(table)),
    tenantColumnsReady: REQUIRED_TENANT_COLUMNS.every(table => !tableSet.has(table) || tenantColumnTables.has(table)),
    roleMasterReady: roleMasterStatus.ready,
    globalCompanyIdentityReady: globalCompanyIdentityStatus.ready,
  }
}

async function getGlobalCompanyIdentityReadiness(client: PgClient) {
  const [indexResult, bindingColumnResult, triggerResult] = await Promise.all([
    client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'organizations_global_tax_uidx',
        'companies_tenant_tax_uidx',
        'tenant_company_scopes_owned_company_uidx',
        'tenant_database_bindings_protected_idx',
        'tenant_database_bindings_dedicated_connection_uidx'
      )
    `),
    client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tenant_database_bindings'
        AND column_name IN ('protected_data', 'migration_status', 'migration_started_at', 'cutover_at')
    `),
    client.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgname = 'enforce_single_owned_company_scope_per_organization_trg'
        AND NOT tgisinternal
    `),
  ])
  const indexes = new Set(indexResult.rows.map(row => String(row.indexname)))
  const bindingColumns = new Set(bindingColumnResult.rows.map(row => String(row.column_name)))
  const triggers = new Set(triggerResult.rows.map(row => String(row.tgname)))

  return {
    ready:
      indexes.has('organizations_global_tax_uidx') &&
      indexes.has('companies_tenant_tax_uidx') &&
      indexes.has('tenant_company_scopes_owned_company_uidx') &&
      indexes.has('tenant_database_bindings_protected_idx') &&
      indexes.has('tenant_database_bindings_dedicated_connection_uidx') &&
      triggers.has('enforce_single_owned_company_scope_per_organization_trg') &&
      bindingColumns.has('protected_data') &&
      bindingColumns.has('migration_status') &&
      bindingColumns.has('migration_started_at') &&
      bindingColumns.has('cutover_at'),
  }
}

async function getRoleMasterReadiness(client: PgClient) {
  const { rows } = await client.query(`
    SELECT pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'enforce_single_master_role'
    LIMIT 1
  `)

  const definition = String(rows[0]?.definition || '')
  if (!definition) return { ready: true }

  const indexResult = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_employees_unique_tenant_person_role',
        'idx_company_partners_unique_tenant_person_role',
        'idx_company_partners_unique_tenant_organization_role'
      )
  `)
  const indexNames = new Set(indexResult.rows.map(row => String(row.indexname)))

  return {
    ready:
      definition.includes('to_jsonb(NEW)') &&
      definition.includes('COALESCE(tenant_id') &&
      indexNames.has('idx_employees_unique_tenant_person_role') &&
      indexNames.has('idx_company_partners_unique_tenant_person_role') &&
      indexNames.has('idx_company_partners_unique_tenant_organization_role'),
  }
}

async function listPublicTables(client: PgClient) {
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> 'schema_migrations'
    ORDER BY table_name
  `)

  return rows.map(row => String(row.table_name))
}

async function ensureMigrationTable(client: PgClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function applyPendingMigrations(client: PgClient) {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const files = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort()

  for (const file of files) {
    await applyMigration(client, file)
  }
}

async function applyMigration(client: PgClient, file: string, options: { force?: boolean } = {}) {
  if (!options.force) {
    const applied = await client.query('SELECT 1 FROM public.schema_migrations WHERE name = $1', [file])
    if ((applied.rowCount || 0) > 0) return
  }

  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', file)
  const sql = (await readFile(migrationPath, 'utf8')).replace(/^\uFEFF/, '')

  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query(
      `
        INSERT INTO public.schema_migrations (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET applied_at = now()
      `,
      [file]
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

function waitForSchemaReload() {
  return new Promise(resolve => windowlessSetTimeout(resolve, 900))
}

async function reloadPostgrestSchema(client: PgClient) {
  await client.query("NOTIFY pgrst, 'reload schema'")
  await waitForSchemaReload()
}

const windowlessSetTimeout: typeof setTimeout = setTimeout
