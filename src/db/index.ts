import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { isPostgresConfigured, resolvePostgresPoolConfig } from '../lib/db-config.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = (): Pool | null => {
  const cfg = resolvePostgresPoolConfig(process.env);
  if (!cfg.configured) {
    return null;
  }

  if (!global._postgresPool) {
    const maxConnections = process.env.VERCEL ? 3 : 10;
    if (cfg.mode === 'connectionString' && cfg.connectionString) {
      global._postgresPool = new Pool({
        connectionString: cfg.connectionString,
        ssl: cfg.ssl || undefined,
        max: maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
      });
    } else {
      global._postgresPool = new Pool({
        host: cfg.host,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        max: maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = pool ? drizzle(pool, { schema }) : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

export { isPostgresConfigured };
