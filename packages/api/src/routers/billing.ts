import { Polar } from "@polar-sh/sdk";
import { env } from "@xgist/env/server";
import { z } from "zod";

import { protectedProcedure } from "../index";

const polarClient = new Polar({
	accessToken: env.POLAR_ACCESS_TOKEN,
	server: "sandbox",
});

export const billingRouter = {
	getProducts: protectedProcedure.input(z.object({})).handler(async () => {
		const result = await polarClient.products.list({ isArchived: false });
		return { products: result.result.items };
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
