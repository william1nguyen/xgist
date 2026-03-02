import type { IncomingHttpHeaders } from "node:http";
import { auth } from "@xgist/auth";
import { db } from "@xgist/db";
import { fromNodeHeaders } from "better-auth/node";
import type { Redis } from "ioredis";
import type { Client as MinioClient } from "minio";

export async function createContext(
	req: IncomingHttpHeaders,
	redis: Redis,
	minio: MinioClient,
) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req),
	});
	return {
		session,
		db,
		redis,
		minio,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
