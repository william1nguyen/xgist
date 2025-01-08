import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "./db";
import logger from "~/infra/logger";

export const runMigrations = async () => {
  const migrationsFolder = path.resolve(__dirname, "./drizzle/migrations");
  logger.info("Running migrations...");
  await migrate(db, { migrationsFolder });
  logger.info("Migrations completed successfully.");
};
