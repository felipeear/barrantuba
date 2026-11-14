import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool using the Object Method.
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

const TRANSIENT_PG_CODES = new Set([
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '53300', // too_many_connections
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '40001', // serialization_failure
]);

function isTransientDbError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || err?.cause?.code || '');
  if (TRANSIENT_PG_CODES.has(code)) return true;
  const msg = String(err.message || err?.cause?.message || err || '').toLowerCase();
  return (
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('epipe') ||
    msg.includes('econnrefused') ||
    msg.includes('connection terminated unexpectedly') ||
    msg.includes('terminating connection') ||
    msg.includes('timeout expired') ||
    msg.includes('server closed the connection unexpectedly')
  );
}

export async function withDbRetry<T>(fn: () => Promise<T>, label = 'dbOp'): Promise<T> {
  const delays = [150, 450];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < delays.length && isTransientDbError(err)) {
        const waitMs = delays[attempt];
        console.warn(`[DB Retry] ${label} falhou transitoriamente (tentativa ${attempt + 1}); repetindo em ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

