import type { ProcessingOptions, QueueJob, VideoStatus } from "@repo/types";
import { CREDIT_COSTS } from "@xgist/config";
import { and, desc, eq, gte, inArray, lt, lte } from "@xgist/db";
import { videosTable } from "@xgist/db/schema/media";
import { ilike } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { queueCacheKey } from "../lib/queue-cache";

const PAGE_SIZE = 20;

function computeCreditCost(options: ProcessingOptions): number {
	return Object.entries(CREDIT_COSTS).reduce((total, [key, cost]) => {
		return options[key as keyof ProcessingOptions] ? total + cost : total;
	}, 0);
}

export const queueRouter = {
	list: protectedProcedure
		.input(
			z.object({
				search: z.string().optional(),
				status: z
					.array(z.enum(["pending", "processing", "completed", "failed"]))
					.optional(),
				dateFrom: z.string().optional(),
				dateTo: z.string().optional(),
				cursor: z.string().uuid().optional(),
				limit: z.number().int().min(1).max(100).default(PAGE_SIZE),
			}),
		)
		.handler(
			async ({
				input,
				context,
			}): Promise<{ jobs: QueueJob[]; nextCursor: string | null }> => {
				const userId = context.session.user.id;
				const hasFilters =
					input.search ||
					input.status?.length ||
					input.dateFrom ||
					input.dateTo ||
					input.cursor;

				if (!hasFilters) {
					const cached = await context.redis.get(queueCacheKey(userId));
					if (cached) {
						const all = JSON.parse(cached) as QueueJob[];
						const page = all.slice(0, input.limit);
						const nextCursor =
							all.length > input.limit ? all[input.limit - 1].jobId : null;
						return { jobs: page, nextCursor };
					}
				}
				const conditions = [eq(videosTable.userId, userId)];

				if (input.search) {
					conditions.push(ilike(videosTable.title, `%${input.search}%`));
				}

				if (input.status && input.status.length > 0) {
					conditions.push(
						inArray(videosTable.status, input.status as VideoStatus[]),
					);
				}

				if (input.dateFrom) {
					conditions.push(gte(videosTable.createdAt, new Date(input.dateFrom)));
				}

				if (input.dateTo) {
					conditions.push(lte(videosTable.createdAt, new Date(input.dateTo)));
				}

				if (input.cursor) {
					const [cursorRow] = await context.db
						.select({ createdAt: videosTable.createdAt })
						.from(videosTable)
						.where(eq(videosTable.id, input.cursor));
					if (cursorRow) {
						conditions.push(lt(videosTable.createdAt, cursorRow.createdAt));
					}
				}

				const rows = await context.db
					.select()
					.from(videosTable)
					.where(and(...conditions))
					.orderBy(desc(videosTable.createdAt))
					.limit(input.limit + 1);

				const hasMore = rows.length > input.limit;
				const items = hasMore ? rows.slice(0, input.limit) : rows;

				const jobs: QueueJob[] = items.map((v) => ({
					jobId: v.id,
					video: {
						id: v.id,
						title: v.title,
						status: v.status,
						options: v.options as ProcessingOptions,
						createdAt: v.createdAt,
						mediaUrl: v.mediaUrl,
						mediaType: v.mediaType,
					},
					creditCost: computeCreditCost(v.options as ProcessingOptions),
				}));

				const nextCursor = hasMore ? items[items.length - 1].id : null;

				if (!hasFilters) {
					await context.redis.set(
						queueCacheKey(userId),
						JSON.stringify(jobs),
						"EX",
						300,
					);
				}

				return { jobs, nextCursor };
			},
		),
};
