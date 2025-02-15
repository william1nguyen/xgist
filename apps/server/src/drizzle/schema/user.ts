import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { commonFields } from "./base";

export const userTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  keycloakUserId: uuid("keycloak_user_id").notNull(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  ...commonFields,
});
