import type { User } from "@sentry/node";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db";
import { userTable } from "~/drizzle/schema/user";
import logger from "~/infra/logger";
import { itemResponse } from "~/infra/utils/fns";
import { InvalidWebhookTypeError, UserNotFoundError } from "./user.errors";
import type { KeycloakWebhookPayload } from "./user.types";

export const getUserByKeycloakUserId = async (keycloakUserId: string) => {
  const users: User[] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.keycloakUserId, keycloakUserId));

  if (!users) {
    throw new UserNotFoundError();
  }

  return users[0] as User;
};

export const getUserInfo = async (userId: string | undefined) => {
  if (!userId) {
    throw new UserNotFoundError();
  }

  const users = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!users) {
    throw new UserNotFoundError();
  }

  return users[0];
};

export const register = async ({
  time,
  realmId,
  uid,
  authDetails,
  details,
  type,
}: KeycloakWebhookPayload) => {
  if (type !== "access.REGISTER") {
    throw new InvalidWebhookTypeError();
  }

  const keycloakUserId = authDetails.userId;
  const username = authDetails.username;
  const email = details.email;
  try {
    const user = await db
      .insert(userTable)
      .values([
        {
          keycloakUserId,
          username,
          email,
        },
      ])
      .onConflictDoUpdate({
        target: [userTable.id],
        set: {
          keycloakUserId,
          username,
          email,
        },
      })
      .returning();
    return itemResponse({ user: user[0] });
  } catch (error) {
    logger.error({ msg: "Lỗi tạo người dùng", error });
  }
};
