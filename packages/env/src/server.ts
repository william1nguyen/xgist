import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		POLAR_ACCESS_TOKEN: z.string().min(1),
		POLAR_WEBHOOK_SECRET: z.string().min(1),
		POLAR_SUCCESS_URL: z.url(),
		POLAR_PRODUCT_ID_PRO: z.string().min(1),
		POLAR_PRODUCT_ID_ULTIMATE: z.string().min(1),
		CORS_ORIGIN: z.url(),
		REDIS_URL: z.string().min(1),
		MINIO_ENDPOINT: z.string().min(1),
		MINIO_ACCESS_KEY: z.string().min(1),
		MINIO_SECRET_KEY: z.string().min(1),
		MINIO_PORT: z.coerce.number().optional(),
		MINIO_USE_SSL: z
			.string()
			.default("false")
			.transform((v) => v === "true" || v === "1"),
		DB_AUTO_MIGRATE: z
			.string()
			.default("false")
			.transform((v) => v === "true" || v === "1"),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
