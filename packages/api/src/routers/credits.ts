import type { CreditTransaction } from "@repo/types";
import { and, desc, eq, lt, sum } from "@xgist/db";
import { credits, creditTransactions } from "@xgist/db/schema/media";
import { z } from "zod";

import { protectedProcedure } from "../index";

export const creditsRouter = {
	getBalance: protectedProcedure
		.input(z.object({}))
		.handler(
			async ({ context }): Promise<{ balance: number; totalSpent: number }> => {
				const userId = context.session.user.id;

				const [userCredits] = await context.db
					.select()
					.from(credits)
					.where(eq(credits.userId, userId));

				const [spentResult] = await context.db
					.select({ total: sum(creditTransactions.delta) })
					.from(creditTransactions)
					.where(eq(creditTransactions.userId, userId));

				const totalSpentRaw = spentResult?.total
					? Number(spentResult.total)
					: 0;
				const totalSpent = totalSpentRaw < 0 ? Math.abs(totalSpentRaw) : 0;

				return {
					balance: userCredits?.balance ?? 0,
					totalSpent,
				};
			},
		),

	getHistory: protectedProcedure
		.input(
			z.object({
				limit: z.number().int().min(1).max(100).default(20),
				cursor: z.string().optional(),
			}),
		)
		.handler(
			async ({
				input,
				context,
			}): Promise<{
				transactions: CreditTransaction[];
				nextCursor: string | null;
			}> => {
				const userId = context.session.user.id;

				const cursorCondition = input.cursor
					? lt(creditTransactions.id, input.cursor)
					: undefined;

				const rows = await context.db
					.select()
					.from(creditTransactions)
					.where(
						cursorCondition
							? and(eq(creditTransactions.userId, userId), cursorCondition)
							: eq(creditTransactions.userId, userId),
					)
					.orderBy(desc(creditTransactions.createdAt))
					.limit(input.limit + 1);

				const hasMore = rows.length > input.limit;
				const items = hasMore ? rows.slice(0, input.limit) : rows;

				const transactions: CreditTransaction[] = items.map((r) => ({
					id: r.id,
					userId: r.userId,
					delta: r.delta,
					reason: r.reason,
					metadata: r.metadata as Record<string, string | number> | null,
					createdAt: r.createdAt,
				}));

				return {
					transactions,
					nextCursor: hasMore ? items[items.length - 1].id : null,
				};
			},
		),
};
