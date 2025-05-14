import { pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { commonFields } from "./base";

export const voiceEnum = pgEnum("voice", [
  // female
  "en-US-AvaMultilingualNeural",
  "en-US-CoraMultilingualNeural",
  "en-US-NovaTurboMultilingualNeural",

  // male
  "en-US-AndrewMultilingualNeural",
  "en-US-ChristopherMultilingualNeural",
  "en-US-BrandonMultilingualNeural",
]);

export const agentTable = pgTable("agent", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatarUrl").notNull(),
  voiceId: voiceEnum("voice_id").notNull(),
  videoUrl: text("videoUrl").notNull(),
  ...commonFields,
});
