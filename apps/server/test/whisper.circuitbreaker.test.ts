import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("whisper circuit breaker", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.WHISPER_CB_FAILURE_THRESHOLD = "2"; // trip quickly
    process.env.WHISPER_CB_OPEN_MS = "100"; // short open interval
  });

  it("opens circuit after consecutive failures and then blocks further calls until window elapses", async () => {
    // Always reject to force failures
    vi.doMock("axios", () => ({
      default: {
        create: () => ({
          post: vi.fn().mockRejectedValue({ response: { status: 502 } }),
        }),
      },
    }));

    const { transcribe } = await import("~/infra/whisper");

    await expect(transcribe(Buffer.from("a"))).rejects.toThrow(); // failure #1
    await expect(transcribe(Buffer.from("a"))).rejects.toThrow(); // failure #2 -> opens
    await expect(transcribe(Buffer.from("a"))).rejects.toThrow(/CircuitBreakerOpen/); // blocked

    // wait for open interval, half-open will try once and fail, then open again
    await new Promise((r) => setTimeout(r, 120));
    // reduce retries/backoff for speed
    process.env.WHISPER_CB_RETRIES = "0";
    process.env.WHISPER_CB_BACKOFF_MS = "1";
    await expect(transcribe(Buffer.from("a"))).rejects.toThrow();
  }, 10000);

  afterEach(() => {
    process.env = originalEnv;
  });
});


