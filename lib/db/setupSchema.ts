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

    if (readiness.baseReady && readiness.tenantReady && readiness.tenantColumnsReady) {
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
    }

    await reloadPostgrestSchema(client)
  } finally {
    await client.end()
  }
}

async function getSchemaReadiness(client: PgClient) {
  const [tables, tenantColumns] = await Promise.all([
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
  ])

  const tableSet = new Set(tables)
  const tenantColumnTables = new Set(tenantColumns.rows.map(row => row.table_name))

  return {
    baseReady: REQUIRED_BASE_TABLES.every(table => tableSet.has(table)),
    tenantReady: REQUIRED_TENANT_TABLES.every(table => tableSet.has(table)),
    tenantColumnsReady: REQUIRED_TENANT_COLUMNS.every(table => !tableSet.has(table) || tenantColumnTables.has(table)),
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
