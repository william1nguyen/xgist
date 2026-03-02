import { checkout, polar, portal } from "@polar-sh/better-auth";
import { db } from "@xgist/db";
import * as schema from "@xgist/db/schema/auth";
import { credits } from "@xgist/db/schema/media";
import { env } from "@xgist/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { polarClient } from "./lib/payments";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
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
					await db.insert(credits).values({ userId: user.id, balance: 50 });
				},
			},
		},
	},
	plugins: [
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
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
