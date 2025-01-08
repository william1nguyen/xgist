import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

client.on("notice", (msg) => {
  console.log("Notice:", msg);
});

client.on("error", (err) => {
  console.error("Error:", err);
});

await client.connect();
await migrate(drizzle(client), {
  migrationsFolder: "./src/drizzle/migrations",
});

console.log("Done.");

await client.end();
