import { createHmac, timingSafeEqual } from "node:crypto";
import { db, eq, sql } from "@xgist/db";
import { creditsTable, creditTransactionsTable } from "@xgist/db/schema/media";
import { env } from "@xgist/env/server";
import type { FastifyInstance } from "fastify";

function verifySignature(payload: string, signature: string): boolean {
	const hmac = createHmac("sha256", env.POLAR_WEBHOOK_SECRET);
	hmac.update(payload);
	const expected = hmac.digest("hex");
	try {
		return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
	} catch {
		return false;
	}
}

type OrderCreatedEvent = {
	type: "order.created";
	data: {
		metadata: Record<string, string>;
		amount: number;
		product: { metadata: Record<string, string> };
	};
};

export async function polarWebhookRoute(fastify: FastifyInstance) {
	fastify.addContentTypeParser(
		"application/json",
		{ parseAs: "string" },
		(_, body, done) => done(null, body),
	);

	fastify.post("/webhooks/polar", async (request, reply) => {
		const signature = request.headers["polar-signature"];
		const rawBody = request.body as string;

		if (typeof signature !== "string" || !verifySignature(rawBody, signature)) {
			return reply.status(401).send({ error: "Invalid signature" });
		}

		const event = JSON.parse(rawBody) as OrderCreatedEvent;

		if (event.type !== "order.created") {
			return reply.status(200).send({ received: true });
		}

		const userId = event.data.metadata["userId"];
		const creditAmount = Number(event.data.product.metadata["credits"] ?? 0);

		if (!userId || creditAmount <= 0) {
			return reply
				.status(400)
				.send({ error: "Missing userId or credits in metadata" });
		}

		await db.transaction(async (tx) => {
			await tx
				.insert(creditsTable)
				.values({ userId, balance: creditAmount })
				.onConflictDoUpdate({
					target: creditsTable.userId,
					set: {
						balance: sql`${creditsTable.balance} + ${creditAmount}`,
						updatedAt: new Date(),
					},
				});

			await tx.insert(creditTransactionsTable).values({
				userId,
				delta: creditAmount,
				reason: "polar_purchase",
				metadata: { amount: creditAmount },
			});
		});

		return reply.status(200).send({ received: true });
	});
}
