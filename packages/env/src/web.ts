import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type ViteEnv = Record<string, string | undefined>;

const runtimeEnv = (import.meta as unknown as { env: ViteEnv }).env ?? {};

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url().default("http://localhost:8080"),
	},
	runtimeEnv,
	emptyStringAsUndefined: true,
});
