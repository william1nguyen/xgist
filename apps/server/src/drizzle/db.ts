import pg from "pg";
import { env } from "~/env";
import { drizzle } from "drizzle-orm/node-postgres";

const client = new pg.Client({
  connectionString: env.DATABASE_URL as string,
});

async function connectDB() {
  await client.connect();
  console.log("Database connected!...");
}

connectDB();

export const db = drizzle(client);
