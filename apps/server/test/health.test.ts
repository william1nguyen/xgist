import { expect, test } from "vitest";
import { app } from "~/infra/app";

test("health endpoints respond", async () => {
  const health = await app.inject({ method: "GET", url: "/healthz" });
  expect(health.statusCode).toBe(200);
  const ready = await app.inject({ method: "GET", url: "/readyz" });
  expect(ready.statusCode).toBe(200);
});


