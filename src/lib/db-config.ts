export interface ResolvedPostgresConfig {
  configured: boolean;
  mode: 'connectionString' | 'host' | 'none';
  connectionString?: string;
  ssl?: { rejectUnauthorized: false } | false;
  host?: string;
  user?: string;
  password?: string;
  database?: string;
}

export function shouldUseSslForConnectionString(connectionString: string): boolean {
  const lower = connectionString.toLowerCase();
  if (lower.includes('sslmode=disable')) {
    return false;
  }
  if (lower.includes('sslmode=require') || lower.includes('sslmode=verify')) {
    return true;
  }
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return false;
    }
    return true;
  } catch {
    return !lower.includes('localhost') && !lower.includes('127.0.0.1');
  }
}

export function resolvePostgresPoolConfig(
  env: Record<string, string | undefined> = process.env
): ResolvedPostgresConfig {
  const connectionString = (
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.POSTGRES_PRISMA_URL ||
    ''
  ).trim();

  if (connectionString) {
    const useSsl = shouldUseSslForConnectionString(connectionString);
    return {
      configured: true,
      mode: 'connectionString',
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    };
  }

  const host = (env.SQL_HOST || '').trim();
  const database = (env.SQL_DB_NAME || '').trim();
  if (host && database) {
    return {
      configured: true,
      mode: 'host',
      host,
      user: env.SQL_USER,
      password: env.SQL_PASSWORD,
      database,
    };
  }

  return {
    configured: false,
    mode: 'none',
  };
}

export function isPostgresConfigured(
  env: Record<string, string | undefined> = process.env
): boolean {
  return resolvePostgresPoolConfig(env).configured;
}
