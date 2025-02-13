import { migrate } from 'drizzle-orm/node-postgres/migrator';
import logger from '~/infra/logger';
import { db } from './db';

export const runMigrations = async () => {
  logger.info("Running migrations...");
  await migrate(db, {
    migrationsFolder: './src/drizzle/migrations'
  });
  logger.info("Migrations completed successfully.");
}