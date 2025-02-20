import { z } from "zod";

const envSchema = z.object({
  VITE_KEYCLOAK_URL: z.string(),
  VITE_KEYCLOAK_REALM: z.string(),
  VITE_CLIENT_ID: z.string(),
  VITE_BASE_URL: z.string(),
});

type Env = z.infer<typeof envSchema>;

const loadEnvConfig = (): Env => {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    console.error("❌ Invalid environment variables:\n", issues.join("\n"));
    throw new Error("Invalid environment variables");
  }

  return result.data;
};

export const env: Env = loadEnvConfig();
