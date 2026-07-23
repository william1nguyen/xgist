import { env } from "@media-notes/env/server";
import { Polar } from "@polar-sh/sdk";
import { z } from "zod";

import { protectedProcedure } from "../index";

const polarClient = new Polar({
	accessToken: env.POLAR_ACCESS_TOKEN,
	server: "sandbox",
});

export type PlanTier = "free" | "plus" | "ultimate";

export type BillingPlan = {
	tier: PlanTier;
	productId: string;
	name: string;
	description: string | null;
	credits: number;
	priceAmount: number | null;
	priceCurrency: string | null;
	recurringInterval: string | null;
	benefits: string[];
};

function toBillingPlan(
	tier: BillingPlan["tier"],
	product: Awaited<ReturnType<typeof polarClient.products.get>>,
): BillingPlan {
	const price = product.prices.find(
		(candidate) => candidate.amountType === "fixed" && !candidate.isArchived,
	);

	return {
		tier,
		productId: product.id,
		name: product.name,
		description: product.description,
		credits: Number(product.metadata.credits ?? 0),
		priceAmount: price?.amountType === "fixed" ? price.priceAmount : null,
		priceCurrency: price?.amountType === "fixed" ? price.priceCurrency : null,
		recurringInterval: product.recurringInterval,
		benefits: product.benefits.map((benefit) => benefit.description),
	};
}

export const billingRouter = {
	getPlans: protectedProcedure
		.input(z.object({}))
		.handler(async (): Promise<{ plans: BillingPlan[] }> => {
			const [free, plus, ultimate] = await Promise.all([
				polarClient.products.get({ id: env.POLAR_PRODUCT_ID_FREE }),
				polarClient.products.get({ id: env.POLAR_PRODUCT_ID_PLUS }),
				polarClient.products.get({ id: env.POLAR_PRODUCT_ID_ULTIMATE }),
			]);

			return {
				plans: [
					toBillingPlan("free", free),
					toBillingPlan("plus", plus),
					toBillingPlan("ultimate", ultimate),
				],
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

			let plan: PlanTier = "free";
			if (active.product.id === env.POLAR_PRODUCT_ID_ULTIMATE) {
				plan = "ultimate";
			} else if (active.product.id === env.POLAR_PRODUCT_ID_PLUS) {
				plan = "plus";
			}

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
