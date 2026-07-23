import { db } from "@media-notes/db";
import {
	accountTable,
	sessionTable,
	userTable,
	verificationTable,
} from "@media-notes/db/schema/auth";
import { creditsTable } from "@media-notes/db/schema/media";
import { env } from "@media-notes/env/server";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { polarClient } from "./lib/payments";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: userTable,
			session: sessionTable,
			account: accountTable,
			verification: verificationTable,
		},
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		generateId: () => crypto.randomUUID(),
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const freeProduct = await polarClient.products.get({
						id: env.POLAR_PRODUCT_ID_FREE,
					});
					const welcomeCredits = Number(freeProduct.metadata.credits ?? 0);

					if (!Number.isFinite(welcomeCredits) || welcomeCredits <= 0) {
						throw new Error(
							"Free Polar product must define positive credits metadata",
						);
					}

					await db
						.insert(creditsTable)
						.values({ userId: user.id, balance: welcomeCredits });
				},
			},
		},
	},
	plugins: [
		polar({
			client: polarClient,
			createCustomerOnSignUp: false,
			enableCustomerPortal: true,
			use: [
				checkout({
					products: [],
					successUrl: env.POLAR_SUCCESS_URL,
					authenticatedUsersOnly: true,
				}),
				portal(),
			],
		}),
	],
});
