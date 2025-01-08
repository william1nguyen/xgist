import {env} from '~/env';
import * as schema from './schema';

import {drizzle} from 'drizzle-orm/node-postgres';
import pg from 'pg';
import logger from '~/infra/logger';

interface PoolOptions {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis?: number;
}

const createPool = (options: PoolOptions) => {
  const pool = new pg.Pool(options);

  pool.on('error', (err) => {
    logger.error({msg: 'Postgres pool error:', err});
  });

  return pool;
};

const createDb = (pool: pg.Pool) => {
  return drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV !== 'production',
  });
};

const mainPool = createPool({
  connectionString: env.DATABASE_URL,
  max: Number(env.DATABASE_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: Number(env.DATABASE_IDLE_TIMEOUT_MS) || 60000,
});

export const db = createDb(mainPool);

const sidePool = createPool({
  connectionString: env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 60000,
});

export const sideDb = createDb(sidePool);

export const closeDb = async () => {
  await mainPool.end();
  await sidePool.end();
};
