const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { getPgSslConfig } = require('./pg-ssl-config');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');
const REQUIRED_CONFIRMATION = 'RESET_PUBLIC_SCHEMA';

function readEnv(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');

        return [key, value];
      })
  );
}

function parseTarget(connectionString) {
  const url = new URL(connectionString);

  return {
    database: url.pathname.replace(/^\//, '') || '(none)',
    host: url.hostname,
    port: url.port || '5432',
    protocol: url.protocol,
    user: url.username,
  };
}

function maskUser(user) {
  if (!user) {
    return '(none)';
  }

  if (user.length <= 6) {
    return `${user.slice(0, 2)}***`;
  }

  return `${user.slice(0, 6)}...${user.slice(-4)}`;
}

function assertConfirmation(target) {
  if (process.env.EDEN_RESET_DATABASE_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Refusing to reset public schema. Set EDEN_RESET_DATABASE_CONFIRM=${REQUIRED_CONFIRMATION}.`
    );
  }

  if (process.env.EDEN_RESET_DATABASE_HOST !== target.host) {
    throw new Error(
      `Refusing to reset ${target.host}. Set EDEN_RESET_DATABASE_HOST=${target.host}.`
    );
  }
}

async function countPublicObjects(client) {
  const result = await client.query(`
    SELECT
      c.relkind,
      COUNT(*)::int AS count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
    GROUP BY c.relkind
    ORDER BY c.relkind;
  `);

  return Object.fromEntries(result.rows.map((row) => [row.relkind, row.count]));
}

async function resetPublicSchema(client) {
  await client.query('BEGIN');

  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query("COMMENT ON SCHEMA public IS 'standard public schema';");

    await client.query(`
      DO $$
      DECLARE
        role_name TEXT;
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
          EXECUTE 'ALTER SCHEMA public OWNER TO postgres';
        END IF;

        FOREACH role_name IN ARRAY ARRAY['postgres', 'anon', 'authenticated', 'service_role']
        LOOP
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', role_name);
          END IF;
        END LOOP;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          EXECUTE 'GRANT ALL ON SCHEMA public TO service_role';
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
          EXECUTE 'GRANT ALL ON SCHEMA public TO postgres';
          EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres';
          EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres';
          EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres';

          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role';
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role';
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role';
          END IF;

          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated';
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated';
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated';
          END IF;

          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO anon';
            EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon';
          END IF;
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const env = readEnv(envPath);

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const target = parseTarget(env.DATABASE_URL);
  assertConfirmation(target);

  console.log(
    `Reset target: ${target.protocol}//${maskUser(target.user)}@${target.host}:${target.port}/${target.database}`
  );

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: getPgSslConfig(env.DATABASE_URL),
  });

  await client.connect();

  try {
    const before = await countPublicObjects(client);
    console.log(`Public objects before reset: ${JSON.stringify(before)}`);

    await resetPublicSchema(client);

    const after = await countPublicObjects(client);
    console.log(`Public objects after reset: ${JSON.stringify(after)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
