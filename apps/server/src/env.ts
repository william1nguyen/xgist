import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import dotenv from "dotenv";
import { createError } from "./infra/utils/errors";
import { OptionalDefaultNull } from "./infra/utils/schema";

const EnvSchema = Type.Object({
  NODE_ENV: Type.Union([
    Type.Literal("development"),
    Type.Literal("production"),
    Type.Literal("test"),
  ]),

  LOG_LEVEL: Type.Union([
    Type.Literal("debug"),
    Type.Literal("info"),
    Type.Literal("error"),
    Type.Literal("silent"),
  ]),

  APP_URL: Type.String(),

  JWKS_URI: Type.String(),
  DATABASE_URL: Type.String(),

  WHISPERAI_URL: Type.String(),
  GEMINI_URL: Type.String(),
  GOOGLE_API_KEY: Type.String(),
  LMSTUDIO_URL: Type.String(),

  MINIO_ENDPOINT: Type.String(),
  MINIO_API_ENDPOINT: Type.String(),
  MINIO_PORT: OptionalDefaultNull(Type.Number({ integer: true })),
  MINIO_USE_SSL: Type.Boolean(),
  MINIO_ACCESS_KEY: Type.String(),
  MINIO_SECRET_KEY: Type.String(),

  JWT_SECRET: Type.String(),
  JWT_EXPIRE: Type.String(),

  REDIS_URL: Type.String(),
  REDIS_MAX_CONCURRENCY: Type.Number(),

  BULL_REDIS_DB: Type.Number(),

  BULL_BOARD_USERNAME: Type.String(),
  BULL_BOARD_PASSWORD: Type.String(),
  BULL_API_CALLBACK_URL: Type.String(),

  X_API_KEY: Type.String(),

  // Optional monitoring settings
  SENTRY_DSN: OptionalDefaultNull(Type.String()),
  SENTRY_TRACES_SAMPLE_RATE: OptionalDefaultNull(Type.Number()),
});

type Env = Static<typeof EnvSchema>;

const InvalidEnvError = createError("INVALID_ENV", "Invalid env vars: %s");

const coerceInt = (x: string | null | undefined) => {
  if (!x) {
    return null;
  }
  return Number.parseInt(x, 10);
};

const coerceFloat = (x: string | null | undefined) => {
  if (!x) {
    return null;
  }
  return Number.parseFloat(x);
};

const coerceBool = (x: string | null | undefined) =>
  x?.toLowerCase() === "true" || x?.toLowerCase() === "t" || x === "1";

const validateEnv = (): Env => {
  console.info("Validating environment variables.");
  dotenv.config();

  const validator = TypeCompiler.Compile(EnvSchema);

  const env = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    LOG_LEVEL: process.env.LOG_LEVEL,

    APP_URL: process.env.APP_URL,

    JWKS_URI: process.env.JWKS_URI,
    DATABASE_URL: process.env.DATABASE_URL,

    WHISPERAI_URL: process.env.WHISPERAI_URL,
    GEMINI_URL: process.env.GEMINI_URL,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    LMSTUDIO_URL: process.env.LMSTUDIO_URL,

    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_API_ENDPOINT: process.env.MINIO_API_ENDPOINT,
    MINIO_PORT: coerceInt(process.env.MINIO_PORT),
    MINIO_USE_SSL: coerceBool(process.env.MINIO_USE_SSL),
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,

    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,

    REDIS_URL: process.env.REDIS_URL,
    REDIS_MAX_CONCURRENCY: coerceInt(process.env.REDIS_MAX_CONCURRENCY),

    BULL_REDIS_DB: coerceInt(process.env.BULL_REDIS_DB),

    BULL_BOARD_USERNAME: process.env.BULL_BOARD_USERNAME,
    BULL_BOARD_PASSWORD: process.env.BULL_BOARD_PASSWORD,
    BULL_API_CALLBACK_URL: process.env.BULL_API_CALLBACK_URL,

    X_API_KEY: process.env.X_API_KEY,
  };

  // In test environment, provide safe defaults and relax strictness
  if (env.NODE_ENV === "test") {
    const withDefaults = {
      ...env,
      APP_URL: env.APP_URL ?? "http://localhost:5173",
      JWKS_URI: env.JWKS_URI ?? "http://localhost/.well-known/jwks.json",
      DATABASE_URL: env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/db",
      WHISPERAI_URL: env.WHISPERAI_URL ?? "http://localhost:8000",
      GEMINI_URL: env.GEMINI_URL ?? "http://localhost:8800",
      GOOGLE_API_KEY: env.GOOGLE_API_KEY ?? "test-key",
      LMSTUDIO_URL: env.LMSTUDIO_URL ?? "http://localhost:1234",
      MINIO_ENDPOINT: env.MINIO_ENDPOINT ?? "localhost",
      MINIO_API_ENDPOINT: env.MINIO_API_ENDPOINT ?? "localhost:9000",
      MINIO_PORT: env.MINIO_PORT ?? 9000,
      MINIO_USE_SSL: env.MINIO_USE_SSL ?? false,
      MINIO_ACCESS_KEY: env.MINIO_ACCESS_KEY ?? "minio-access",
      MINIO_SECRET_KEY: env.MINIO_SECRET_KEY ?? "minio-secret",
      JWT_SECRET: env.JWT_SECRET ?? "secret",
      JWT_EXPIRE: env.JWT_EXPIRE ?? "1d",
      REDIS_URL: env.REDIS_URL ?? "redis://localhost:6379/0",
      REDIS_MAX_CONCURRENCY: env.REDIS_MAX_CONCURRENCY ?? 5,
      BULL_REDIS_DB: env.BULL_REDIS_DB ?? 1,
      BULL_BOARD_USERNAME: env.BULL_BOARD_USERNAME ?? "admin",
      BULL_BOARD_PASSWORD: env.BULL_BOARD_PASSWORD ?? "admin",
      BULL_API_CALLBACK_URL: env.BULL_API_CALLBACK_URL ?? "http://localhost:8080/callback",
      X_API_KEY: env.X_API_KEY ?? "test-key",
    } as Env;
    return withDefaults;
  }

  if (!validator.Check(env)) {
    const errors = [...validator.Errors(env)];
    throw new InvalidEnvError(JSON.stringify(errors, null, 2));
  }

  return env;
};

export const env = validateEnv();
