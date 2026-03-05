import type { QueueJob, VideoStatus } from "@repo/types";
import type { Redis } from "ioredis";

const QUEUE_CACHE_TTL = 300;

export function queueCacheKey(userId: string): string {
	return `queue:${userId}`;
}

async function readCache(
	redis: Redis,
	userId: string,
): Promise<QueueJob[] | null> {
	const raw = await redis.get(queueCacheKey(userId));
	return raw ? (JSON.parse(raw) as QueueJob[]) : null;
}

async function writeCache(
	redis: Redis,
	userId: string,
	jobs: QueueJob[],
): Promise<void> {
	await redis.set(
		queueCacheKey(userId),
		JSON.stringify(jobs),
		"EX",
		QUEUE_CACHE_TTL,
	);
}

export async function prependJobToCache(
	redis: Redis,
	userId: string,
	job: QueueJob,
): Promise<void> {
	const existing = await readCache(redis, userId);
	const jobs = existing
		? [job, ...existing.filter((j) => j.jobId !== job.jobId)]
		: [job];
	await writeCache(redis, userId, jobs);
}

export async function patchJobInCache(
	redis: Redis,
	userId: string,
	videoId: string,
	patch: Partial<{
		status: VideoStatus;
		options: QueueJob["video"]["options"];
	}>,
): Promise<void> {
	const existing = await readCache(redis, userId);
	if (!existing) return;
	const jobs = existing.map((j) =>
		j.video.id === videoId ? { ...j, video: { ...j.video, ...patch } } : j,
	);
	await redis.set(queueCacheKey(userId), JSON.stringify(jobs), "KEEPTTL");
}

export async function invalidateQueueCache(
	redis: Redis,
	userId: string,
): Promise<void> {
	await redis.del(queueCacheKey(userId));
}
