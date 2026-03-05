import { env } from "@xgist/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });
pool.on("error", () => {});

export const db = drizzle(pool, { schema });
export type Database = typeof db;

export {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNotNull,
	isNull,
	lt,
	lte,
	ne,
	notInArray,
	or,
	sql,
	sum,
} from "drizzle-orm";
export * from "./schema/auth";
export * from "./schema/media";
