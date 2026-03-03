import * as schema from "@xgist/db/schema/index";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env";
import { seedUsers } from "./users";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function simulate() {
	await seedUsers(db);
	await pool.end();
}

simulate().catch((err) => {
	console.error(err);
	process.exit(1);
});
