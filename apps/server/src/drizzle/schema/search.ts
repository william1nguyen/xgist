import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { relations } from "drizzle-orm";

export const searchHistoryTable = pgTable("search_history", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: uuid("user_id")
    .references(() => userTable.id)
    .notNull(),
  keyword: text("keyword").notNull(),
});

export const searchHistoryRelations = relations(
  searchHistoryTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [searchHistoryTable.userId],
      references: [userTable.id],
    }),
  })
);
