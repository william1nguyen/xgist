import { type Static, Type } from "@sinclair/typebox";
import {
  BaseModelSchema,
  createItemResponseSchema,
} from "~/infra/utils/schema";

export const User = Type.Object({
  ...BaseModelSchema,
  avatar: Type.String(),
  email: Type.String({ format: "email" }),
  username: Type.String(),
  gender: Type.String(),
  dateOfBirth: Type.String(),
  firstName: Type.String(),
});

export type User = Static<typeof User>;

export type Principal = {
  userId: string;
};

export const LoginParams = Type.Object({
  email: Type.String(),
  password: Type.String(),
});

export type LoginParams = Static<typeof LoginParams>;

export const LoginResponse = Type.Object({
  accessToken: Type.String(),
  expiresIn: Type.String(),
  user: User,
});

export type LoginResponse = Static<typeof LoginResponse>;

export const RegisterBody = Type.Object({
  type: Type.Union([Type.Literal("email"), Type.Literal("phone")]),
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 6, pattern: "^.{6,200}$" }),
});

export type RegisterBody = Static<typeof RegisterBody>;

export const RegisterResponse = createItemResponseSchema("user", User);
export type RegisterResponse = Static<typeof RegisterResponse>;

export const UpdateUserBody = Type.Object({
  email: Type.Optional(Type.String({ format: "email" })),
  phoneNumber: Type.Optional(Type.String()),
  birthDate: Type.Optional(Type.String({ format: "date" })),
  fullname: Type.Optional(Type.String()),
});

export type UpdateUserBody = Static<typeof UpdateUserBody>;

export const GetUserInfoResponse = createItemResponseSchema("user", User);
export type GetUserInfoResponse = Static<typeof GetUserInfoResponse>;

export const FollowUserBody = Type.Object({
  followedId: Type.String({ format: "uuid" }),
});
export type FollowUserBody = Static<typeof FollowUserBody>;
