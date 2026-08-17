import { act, renderHook } from "@testing-library/react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { useMediaProgress } from "./useMediaProgress";

// Covers ADR 0005's own validation checklist (docs/adr/0005-progress-update-delivery.md,
// "Validation" section): start, terminal stop, hidden/offline pause, resume
// refetch, newer-version-wins merge, backoff growth/reset, Retry-After, and
// authentication failure.
//
// Fake timers are active throughout, so every await on a fetch mock is
// flushed explicitly with `flush()` (a zero-length async timer advance)
// rather than testing-library's `waitFor`, which polls with real timers and
// never resolves once fake timers replace them.

type MockBody = {
	data?: { mediaProgress: unknown[] };
	errors?: Array<{
		extensions?: { code?: string; retryAfterSeconds?: number };
	}>;
};

function mockResponse(
	body: MockBody,
	init: { status?: number; retryAfter?: string } = {},
) {
	const headers = new Map<string, string>();
	if (init.retryAfter) headers.set("Retry-After", init.retryAfter);
	return {
		status: init.status ?? 200,
		ok: (init.status ?? 200) < 400,
		headers: { get: (key: string) => headers.get(key) ?? null },
		json: async () => body,
	} as Response;
}

function entry(mediaId: string, status: string, version: number) {
	return {
		mediaId,
		status,
		processingStatus: "ACCEPTED",
		completedSteps: 1,
		totalSteps: 2,
		updatedAt: "2026-08-17T00:00:00Z",
		version,
	};
}

async function flush(ms = 0) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

describe("useMediaProgress", () => {
	let fetchMock: Mock;

	beforeEach(() => {
		vi.useFakeTimers();
		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		vi.spyOn(Math, "random").mockReturnValue(0.5);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("starts polling immediately for non-terminal ids", async () => {
		fetchMock.mockResolvedValue(
			mockResponse({ data: { mediaProgress: [entry("m1", "PROCESSING", 1)] } }),
		);

		const { result } = renderHook(() => useMediaProgress(["m1"]));
		await flush();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.current.get("m1")?.version).toBe(1);
	});

	it("stops scheduling once every tracked id reaches a terminal status", async () => {
		fetchMock.mockResolvedValue(
			mockResponse({ data: { mediaProgress: [entry("m1", "COMPLETED", 1)] } }),
		);

		renderHook(() => useMediaProgress(["m1"]));
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await flush(60_000);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("pauses while the document is hidden and does not poll", async () => {
		fetchMock.mockResolvedValue(
			mockResponse({ data: { mediaProgress: [entry("m1", "PROCESSING", 1)] } }),
		);
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => true,
		});

		renderHook(() => useMediaProgress(["m1"]));
		await flush(10_000);

		expect(fetchMock).not.toHaveBeenCalled();

		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => false,
		});
	});

	it("pauses while offline and does not poll", async () => {
		fetchMock.mockResolvedValue(
			mockResponse({ data: { mediaProgress: [entry("m1", "PROCESSING", 1)] } }),
		);
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

		renderHook(() => useMediaProgress(["m1"]));
		await flush(10_000);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("refetches immediately on visibility/online resume", async () => {
		fetchMock.mockResolvedValue(
			mockResponse({ data: { mediaProgress: [entry("m1", "PROCESSING", 1)] } }),
		);
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => true,
		});

		renderHook(() => useMediaProgress(["m1"]));
		await flush();
		expect(fetchMock).not.toHaveBeenCalled();

		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => false,
		});
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			await vi.advanceTimersByTimeAsync(0);
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("only overwrites cached state when the response version is newer", async () => {
		fetchMock
			.mockResolvedValueOnce(
				mockResponse({
					data: { mediaProgress: [entry("m1", "PROCESSING", 5)] },
				}),
			)
			.mockResolvedValueOnce(
				mockResponse({
					data: { mediaProgress: [entry("m1", "PROCESSING", 3)] },
				}),
			);

		const { result } = renderHook(() => useMediaProgress(["m1"]));
		await flush();
		expect(result.current.get("m1")?.version).toBe(5);

		await flush(3000);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result.current.get("m1")?.version).toBe(5);
	});

	it("backs off exponentially on failure and resets to 3s on success", async () => {
		fetchMock
			.mockResolvedValueOnce(mockResponse({ errors: [{}] }, { status: 500 }))
			.mockResolvedValueOnce(mockResponse({ errors: [{}] }, { status: 500 }))
			.mockResolvedValue(
				mockResponse({
					data: { mediaProgress: [entry("m1", "PROCESSING", 1)] },
				}),
			);

		renderHook(() => useMediaProgress(["m1"]));
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// First backoff doubles 3s -> 6s (jitter fixed at 1.0x). Not due at 3s.
		await flush(3000);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await flush(3500);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		// Second backoff doubles 6s -> 12s. Not due 6s later.
		await flush(6000);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		await flush(6500);
		expect(fetchMock).toHaveBeenCalledTimes(3);

		// This call succeeds, so the interval resets to ~3s rather than
		// continuing to back off toward the 30s cap.
		await flush(3500);
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	it("honors Retry-After on a 429 even beyond the 30s backoff cap", async () => {
		fetchMock
			.mockResolvedValueOnce(
				mockResponse({ errors: [{}] }, { status: 429, retryAfter: "45" }),
			)
			.mockResolvedValueOnce(
				mockResponse({
					data: { mediaProgress: [entry("m1", "PROCESSING", 1)] },
				}),
			);

		renderHook(() => useMediaProgress(["m1"]));
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await flush(30_000);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await flush(15_500);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("stops polling permanently and reports an authentication failure", async () => {
		fetchMock.mockResolvedValue(
			mockResponse({ errors: [{ extensions: { code: "UNAUTHENTICATED" } }] }),
		);
		const onAuthError = vi.fn();

		renderHook(() => useMediaProgress(["m1"], { onAuthError }));
		await flush();

		expect(onAuthError).toHaveBeenCalledTimes(1);

		await flush(60_000);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
