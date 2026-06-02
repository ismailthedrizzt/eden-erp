const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { getPgSslConfig } = require('./pg-ssl-config');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');
const migrationsDir = path.join(root, 'supabase', 'migrations');

function listMigrationFiles() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  moveAfter(files, '20260526_company_branch_p2_fixes.sql', '20260526_company_official_changes.sql');
  moveAfter(files, '20260526_event_contract_outbox_dispatcher.sql', '20260526_operation_orchestrator_registry.sql');
  return files;
}

function moveAfter(files, target, dependency) {
  const targetIndex = files.indexOf(target);
  const dependencyIndex = files.indexOf(dependency);
  if (targetIndex === -1 || dependencyIndex === -1 || targetIndex > dependencyIndex) return;
  files.splice(targetIndex, 1);
  files.splice(files.indexOf(dependency) + 1, 0, target);
}

function readEnv(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function applyMigration(client, name) {
  const alreadyApplied = await client.query(
    'SELECT 1 FROM public.schema_migrations WHERE name = $1',
    [name]
  );

  if (alreadyApplied.rowCount > 0) {
    console.log(`skip ${name}`);
    return;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8').replace(/^\uFEFF/, '');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [name]);
    await client.query('COMMIT');
    console.log(`applied ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`${name} failed: ${error.message}`);
  }
}

async function main() {
  const env = readEnv(envPath);

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: getPgSslConfig(env.DATABASE_URL),
  });

  await client.connect();
  try {
    await ensureMigrationTable(client);

    for (const file of listMigrationFiles()) {
      await applyMigration(client, file);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
