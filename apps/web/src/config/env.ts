import { z } from "zod";

const envSchema = z.object({
  VITE_KEYCLOAK_URL: z.string(),
  VITE_KEYCLOAK_REALM: z.string(),
  VITE_CLIENT_ID: z.string(),
  VITE_BASE_URL: z.string(),
});

type Env = z.infer<typeof envSchema>;

const validateEnv = (): Env => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `${issue.path.join(".")}: ${issue.message}`;
      });
      console.error("❌ Invalid environment variables:\n", issues.join("\n"));
      process.exit(1);
    }

    console.error("❌ Unknown error validating environment variables:", error);
    process.exit(1);
  }
};

export const env = validateEnv();
