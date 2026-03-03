import { accountTable, userTable } from "@xgist/db/schema/auth";
import type * as schema from "@xgist/db/schema/index";
import { creditsTable, creditTransactionsTable } from "@xgist/db/schema/media";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/node-postgres";

type Db = ReturnType<typeof drizzle<typeof schema>>;

type MockUser = {
	name: string;
	email: string;
	password: string;
	balance: number;
};

export const mockUsers: MockUser[] = [
	{
		name: "demo",
		email: "demo@gmail.com",
		password: "password",
		balance: 1_000_000,
	},
];

export async function seedUsers(db: Db) {
	const userRows = mockUsers.map((u) => ({
		id: crypto.randomUUID(),
		name: u.name,
		email: u.email,
		emailVerified: true as const,
		createdAt: new Date(),
		updatedAt: new Date(),
	}));

	const inserted = await db
		.insert(userTable)
		.values(userRows)
		.onConflictDoNothing()
		.returning({ id: userTable.id, email: userTable.email });

	if (inserted.length === 0) {
		console.log("⚠ users: all exist, skipping");
		return;
	}

	for (const row of inserted) {
		const mock = mockUsers.find((u) => u.email === row.email);
		if (!mock) continue;

		const hashedPassword = await hashPassword(mock.password);

		await db.insert(accountTable).values({
			id: crypto.randomUUID(),
			accountId: row.id,
			providerId: "credential",
			userId: row.id,
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const [existing] = await db
			.select({ userId: creditsTable.userId })
			.from(creditsTable)
			.where(eq(creditsTable.userId, row.id))
			.limit(1);

		if (!existing) {
			await db.insert(creditsTable).values({
				userId: row.id,
				balance: mock.balance,
				updatedAt: new Date(),
			});

			await db.insert(creditTransactionsTable).values({
				userId: row.id,
				delta: mock.balance,
				reason: "mock_seed",
				metadata: { note: "Mock seed" },
				createdAt: new Date(),
			});
		}

		console.log(`✓ ${mock.email} / ${mock.password} | ${mock.balance} credits`);
	}
}
