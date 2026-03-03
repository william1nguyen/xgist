import { checkout, polar, portal } from "@polar-sh/better-auth";
import { db } from "@xgist/db";
import {
	accountTable,
	sessionTable,
	userTable,
	verificationTable,
} from "@xgist/db/schema/auth";
import { creditsTable } from "@xgist/db/schema/media";
import { env } from "@xgist/env/server";
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
					await db
						.insert(creditsTable)
						.values({ userId: user.id, balance: 50 });
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
