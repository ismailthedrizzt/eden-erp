const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');
const migrationsDir = path.join(root, 'supabase', 'migrations');

const migrationFiles = [
  '20240501_create_sirketler_table.sql',
  '20240502_complete_core_schema.sql',
  '20240503_rename_personel_to_employees.sql',
  '20240504_extend_employee_form_schema.sql',
  '20240505_employee_soft_delete_and_history.sql',
  '20240506_add_employee_cv_document.sql',
  '20240507_reference_data_and_employee_optional_fields.sql',
  '20240508_relax_employee_optional_fields.sql',
  '20240509_company_soft_delete_and_history.sql',
  '20240510_company_assets_and_types.sql',
  '20240511_company_representatives_erp_model.sql',
  '20240512_company_partners_ownership_model.sql',
  '20240513_partner_detail_form_assets.sql',
  '20240514_representative_detail_form_assets.sql',
  '20240515_create_stakeholders.sql',
  '20240516_company_public_institution_data.sql',
  '20240517_partner_corporate_control_fields.sql',
  '20240518_organization_and_positions_model.sql',
  '20240519_company_vehicles.sql',
  '20260503_backend_architecture_foundation.sql',
  '20260503_identity_master_model.sql',
  '20260509_ownership_transactions.sql',
  '20260510_ownership_transactions_scope_split.sql',
  '20260510_document_media_registry.sql',
  '20260510_employee_marital_status.sql',
  'create_module_licenses.sql',
  'add_employee_unique_constraint.sql',
];

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

  if (name === 'create_module_licenses.sql') {
    const existing = await client.query(`
      SELECT to_regclass('public.module_licenses') AS modules,
             to_regclass('public.submodule_licenses') AS submodules;
    `);

    if (existing.rows[0].modules && existing.rows[0].submodules) {
      await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [name]);
      console.log(`mark ${name}`);
      return;
    }
  }

  const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');

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
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await ensureMigrationTable(client);

    for (const file of migrationFiles) {
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
