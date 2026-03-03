import { ORPCError } from "@orpc/server";
import type { ProcessingOptions, QueueJob } from "@repo/types";
import { CREDIT_COSTS } from "@xgist/config";
import { desc, eq } from "@xgist/db";
import { videosTable } from "@xgist/db/schema/media";
import { z } from "zod";

import { protectedProcedure } from "../index";

function computeCreditCost(options: ProcessingOptions): number {
	return Object.entries(CREDIT_COSTS).reduce((total, [key, cost]) => {
		return options[key as keyof ProcessingOptions] ? total + cost : total;
	}, 0);
}

export const queueRouter = {
	list: protectedProcedure
		.input(z.object({}))
		.handler(async ({ context }): Promise<{ jobs: QueueJob[] }> => {
			const userId = context.session.user.id;

			const rows = await context.db
				.select()
				.from(videosTable)
				.where(eq(videosTable.userId, userId))
				.orderBy(desc(videosTable.createdAt));

			const jobs: QueueJob[] = rows.map((v) => ({
				jobId: v.id,
				video: {
					id: v.id,
					title: v.title,
					status: v.status,
					options: v.options as ProcessingOptions,
					createdAt: v.createdAt,
				},
				creditCost: computeCreditCost(v.options as ProcessingOptions),
			}));

			return { jobs };
		}),
};
