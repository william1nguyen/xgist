import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "~/drizzle/db";
import { authTable, userFollowUser, userTable } from "~/drizzle/schema";
import { withoutDeleted } from "~/drizzle/utils";
import { env } from "~/env";
import {
  CreateUserError,
  EmailAlreadyRegisteredError,
  PasswordNotMatchedError,
  UserNotFoundError,
} from "./user.errors";
import type {
  FollowUserBody,
  LoginParams,
  RegisterBody,
  User,
} from "./user.types";

const validateUser = async (value: string, field: "id" | "email") => {
  let condition = eq(userTable.id, value);

  if (field === "email") {
    condition = eq(userTable.email, value);
  }

  const user = await db.query.userTable.findFirst({
    where: withoutDeleted(userTable, condition),
  });

  if (!user) {
    throw new UserNotFoundError();
  }
  return user as User;
};

export const login = async (data: LoginParams) => {
  const user = await validateUser(data.email, "email");
  const userAuth = await db.query.authTable.findFirst({
    where: eq(authTable.userId, user.id),
  });

  if (!userAuth) {
    throw new UserNotFoundError();
  }

  const passwordMatched = await bcrypt.compare(
    data.password,
    userAuth.hashedPassword
  );

  if (!passwordMatched) {
    throw new PasswordNotMatchedError();
  }

  const expiresIn = env.JWT_EXPIRE;
  const accessToken = await jwt.sign({ sub: user.id }, env.JWT_SECRET, {
    expiresIn: expiresIn,
  });

  return {
    accessToken: accessToken,
    expiresIn: expiresIn,
    user: user as User,
  };
};

export const register = async (data: RegisterBody) => {
  const userWithEmail = await db.query.userTable.findFirst({
    where: eq(userTable.email, data.email),
  });

  if (userWithEmail) {
    throw new EmailAlreadyRegisteredError();
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  try {
    const defaultAvatar = `${env.MINIO_ENDPOINT}/phantom/default_avatar/default-avatar.jpg`;
    const username = data.email.split("@")[0];

    const user = await db.transaction(async (tx) => {
      const users = await tx
        .insert(userTable)
        .values({
          avatar: defaultAvatar,
          email: data.email,
          username,
        })
        .returning();

      const user = users[0];

      await tx.insert(authTable).values({
        userId: user.id,
        hashedPassword,
      });

      return user;
    });

    return user as User;
  } catch (err) {
    throw new CreateUserError();
  }
};

export const getUser = async (userId: string) => {
  const user = await validateUser(userId, "id");
  return user;
};

export const getAllFollowings = async (userId: string) => {
  const user = await validateUser(userId, "id");
  const followings = await db.query.userFollowUser.findMany({
    columns: {
      id: true,
      followedId: true,
    },
    where: eq(userFollowUser.followerId, userId),
  });
  return followings;
};

export const follow = async (
  { followedId }: FollowUserBody,
  userId: string
) => {
  const user = await validateUser(userId, "id");
  const followedUser = await validateUser(followedId, "id");

  await db
    .insert(userFollowUser)
    .values({
      followerId: userId,
      followedId: followedId,
    })
    .onConflictDoNothing();

  return followedUser;
};

export const unfollow = async (
  { followedId }: FollowUserBody,
  userId: string
) => {
  const user = await validateUser(userId, "id");
  const followedUser = await validateUser(followedId, "id");

  await db
    .delete(userFollowUser)
    .where(
      and(
        eq(userFollowUser.followerId, userId),
        eq(userFollowUser.followedId, followedId)
      )
    );

  return followedUser;
};
