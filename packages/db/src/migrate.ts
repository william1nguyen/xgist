import { resolve } from "node:path";
import { env } from "@xgist/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as drizzleMigrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function runMigrations() {
	const pool = new Pool({ connectionString: env.DATABASE_URL });
	const db = drizzle(pool);
	await drizzleMigrate(db, {
		migrationsFolder: resolve(process.cwd(), "packages/db/src/migrations"),
	});
	await pool.end();
}
