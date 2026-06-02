const LOCAL_POSTGRES_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function getPgSslConfig(connectionString) {
  if (!connectionString) return undefined;

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode')?.trim().toLowerCase();

    if (sslMode === 'disable') return undefined;
    if (sslMode && sslMode !== 'prefer') return { rejectUnauthorized: false };

    return LOCAL_POSTGRES_HOSTS.has(url.hostname.toLowerCase())
      ? undefined
      : { rejectUnauthorized: false };
  } catch {
    return { rejectUnauthorized: false };
  }
}

module.exports = { getPgSslConfig };
