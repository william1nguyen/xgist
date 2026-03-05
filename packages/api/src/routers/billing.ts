import { Polar } from "@polar-sh/sdk";
import { env } from "@xgist/env/server";
import { z } from "zod";

import { protectedProcedure } from "../index";

const polarClient = new Polar({
	accessToken: env.POLAR_ACCESS_TOKEN,
	server: "sandbox",
});

export type PlanTier = "free" | "pro" | "ultimate";

export const billingRouter = {
	getPlans: protectedProcedure
		.input(z.object({}))
		.handler(async (): Promise<{ productIdMap: Record<string, string> }> => {
			return {
				productIdMap: {
					pro: env.POLAR_PRODUCT_ID_PRO,
					ultimate: env.POLAR_PRODUCT_ID_ULTIMATE,
				},
			};
		}),

	getProducts: protectedProcedure.input(z.object({})).handler(async () => {
		const result = await polarClient.products.list({ isArchived: false });
		return { products: result.result.items };
	}),

	getActivePlan: protectedProcedure.input(z.object({})).handler(
		async ({
			context,
		}): Promise<{
			plan: PlanTier;
			subscriptionId: string | null;
			cancelAtPeriodEnd: boolean;
		}> => {
			const userEmail = context.session.user.email;

			const result = await polarClient.subscriptions.list({
				active: true,
				limit: 10,
			});

			const active = result.result.items.find(
				(sub) => sub.customer.email === userEmail,
			);

			if (!active)
				return {
					plan: "free",
					subscriptionId: null,
					cancelAtPeriodEnd: false,
				};

			const productName = active.product.name.toLowerCase();
			let plan: PlanTier = "free";
			if (productName.includes("ultimate")) plan = "ultimate";
			else if (productName.includes("pro")) plan = "pro";

			return {
				plan,
				subscriptionId: active.id,
				cancelAtPeriodEnd: active.cancelAtPeriodEnd,
			};
		},
	),

	upgradeSubscription: protectedProcedure
		.input(
			z.object({
				subscriptionId: z.string().min(1),
				productId: z.string().min(1),
			}),
		)
		.handler(async ({ input }) => {
			await polarClient.subscriptions.update({
				id: input.subscriptionId,
				subscriptionUpdate: { productId: input.productId },
			});
			return { success: true };
		}),

	cancelSubscription: protectedProcedure
		.input(z.object({ subscriptionId: z.string().min(1) }))
		.handler(async ({ input }) => {
			await polarClient.subscriptions.update({
				id: input.subscriptionId,
				subscriptionUpdate: { cancelAtPeriodEnd: true },
			});
			return { success: true };
		}),

	createCheckout: protectedProcedure
		.input(z.object({ productId: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const userEmail = context.session.user.email;

			const checkout = await polarClient.checkouts.create({
				products: [input.productId],
				successUrl: env.POLAR_SUCCESS_URL,
				customerEmail: userEmail,
				metadata: { userId },
			});

			return { checkoutUrl: checkout.url };
		}),
};
