import { type Static, Type } from "@sinclair/typebox";
import {
  BaseModelSchema,
  createItemResponseSchema,
} from "~/infra/utils/schema";

export const User = Type.Object({
  ...BaseModelSchema,
  keycloakUserId: Type.String({ format: "uuid" }),
  username: Type.String(),
  email: Type.String({ format: "email" }),
});
export type User = Static<typeof User>;

export type KeycloakPrincipal = {
  sub: string;
  user: User;
  token: string;
};

export const KeycloakWebhookPayload = Type.Object({
  id: Type.String(),
  time: Type.Number(),
  realmId: Type.String(),
  uid: Type.String(),
  authDetails: Type.Object({
    realmId: Type.String(),
    clientId: Type.String(),
    userId: Type.String(),
    ipAddress: Type.String(),
    username: Type.String(),
    sessionId: Type.String(),
  }),
  details: Type.Object({
    auth_method: Type.String(),
    auth_type: Type.String(),
    register_method: Type.String(),
    last_name: Type.String(),
    redirect_uri: Type.String(),
    first_name: Type.String(),
    code_id: Type.String(),
    email: Type.String(),
    username: Type.String(),
  }),
  type: Type.String(),
});
export type KeycloakWebhookPayload = Static<typeof KeycloakWebhookPayload>;

export const RegisterResponse = createItemResponseSchema("user", User);
export type RegisterResponse = Static<typeof RegisterResponse>;
