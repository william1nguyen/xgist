import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import dotenv from "dotenv";
import { createError } from "./infra/utils/errors";
import { OptionalDefaultNull } from "./infra/utils/schema";

const EnvSchema = Type.Object({
  NODE_ENV: Type.Union([
    Type.Literal("development"),
    Type.Literal("production"),
  ]),

  LOG_LEVEL: Type.Union([
    Type.Literal("debug"),
    Type.Literal("info"),
    Type.Literal("error"),
    Type.Literal("silent"),
  ]),

  WHISPERAI_URL: Type.String(),
  GEMINI_FLASH_URL: Type.String(),
  GOOGLE_API_KEY: Type.String(),

  MINIO_ENDPOINT: Type.String(),
  MINIO_PORT: OptionalDefaultNull(Type.Number({ integer: true })),
  MINIO_USE_SSL: Type.Boolean(),
  MINIO_ACCESS_KEY: Type.String(),
  MINIO_SECRET_KEY: Type.String(),

  JWT_SECRET: Type.String(),
  JWT_EXPIRE: Type.String(),

  REDIS_URL: Type.String(),
  REDIS_MAX_CONCURRENCY: Type.Number(),

  BULL_BOARD_USERNAME: Type.String(),
  BULL_BOARD_PASSWORD: Type.String(),
  BULL_REDIS_DB: Type.Number(),
  BULL_API_CALLBACK_URL: Type.String(),
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

    WHISPERAI_URL: process.env.WHISPERAI_URL,
    GEMINI_FLASH_URL: process.env.GEMINI_FLASH_URL,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,

    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_PORT: coerceInt(process.env.MINIO_PORT),
    MINIO_USE_SSL: coerceBool(process.env.MINIO_USE_SSL),
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,

    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,

    REDIS_URL: process.env.REDIS_URL,
    REDIS_MAX_CONCURRENCY: coerceInt(process.env.REDIS_MAX_CONCURRENCY),

    BULL_BOARD_USERNAME: process.env.BULL_BOARD_USERNAME,
    BULL_BOARD_PASSWORD: process.env.BULL_BOARD_PASSWORD,
    BULL_REDIS_DB: coerceInt(process.env.BULL_REDIS_DB),
    BULL_API_CALLBACK_URL: process.env.BULL_API_CALLBACK_URL,
  };

  if (!validator.Check(env)) {
    const errors = [...validator.Errors(env)];
    throw new InvalidEnvError(JSON.stringify(errors, null, 2));
  }

  return env;
};

export const env = validateEnv();
