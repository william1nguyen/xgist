import { eq } from "drizzle-orm";
import { InvalidWebhookTypeError, UserNotFoundError } from "./user.errors";
import { userTable } from "~/drizzle/schema/user";
import { db } from "~/drizzle/db";
import { type User } from "@sentry/node";
import { KeycloakWebhookPayload } from "./user.types";
import logger from "~/infra/logger";
import { itemResponse } from "~/infra/utils/fns";

export const getUserByKeycloakUserId = async (keycloakUserId: string) => {
  const users: User[] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.keycloakUserId, keycloakUserId));

  if (!users || users.length === 0) {
    throw new UserNotFoundError();
  }

  return users[0] as User;
};

export const getUserInfo = async (user: User) => {
  if (!user) {
    throw new UserNotFoundError();
  }
  return user;
};

export const registerUser = async ({
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

export const updateUserInfo = async () => {};
