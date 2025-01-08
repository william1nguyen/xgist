import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const genderEnum = pgEnum("gender", ["male", "female", "unknowned"]);
export const permissionEnum = pgEnum("permission", [
  "public",
  "private",
  "friend",
]);

const commonFields = {
  createdTime: timestamptz("created_time").notNull().defaultNow(),
  updatedTime: timestamptz("updated_time").$onUpdate(() => new Date()),
  deletedTime: timestamptz("deleted_time"),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  deletedBy: uuid("deleted_by"),
};

export const userTable = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  avatar: text("avatar").default(""),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  gender: genderEnum("gender").default("unknowned"),
  dateOfBirth: date("date_of_birth"),
  firstName: text("first_name").notNull().default("Người dùng"),
  ...commonFields,
});

export const authTable = pgTable("auth", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: uuid("user_id").references(() => userTable.id),
  hashedPassword: text("hashed_password").notNull(),
});

export const videoTable = pgTable("video", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  url: text("video_url").notNull(),
  description: text("caption").notNull(),
  viewable: permissionEnum("viewable").default("public"),
  category: text("category"),
  transcript: text("transcript"),
  summary: text("summary"),
  ...commonFields,
});

export const userLikeVideoTable = pgTable(
  "user_like_video",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id").references(() => userTable.id),
    videoId: uuid("video_id").references(() => videoTable.id),
  },
  (table) => {
    return {
      uniqueLikeConstraint: uniqueIndex("unique_like").on(
        table.userId,
        table.videoId
      ),
    };
  }
);

export const userFollowUser = pgTable(
  "user_follow_user",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    followerId: text("follower_id").notNull(),
    followedId: text("followed_id").notNull(),
  },
  (table) => ({
    uniqueFollowConstraint: uniqueIndex("unique_follow").on(
      table.followerId,
      table.followedId
    ),
  })
);

export const videoUserRelations = relations(videoTable, ({ many, one }) => ({
  user: one(userTable, {
    fields: [videoTable.createdBy],
    references: [userTable.id],
  }),
}));

export const userFollowUserRelations = relations(userFollowUser, ({ one }) => ({
  follower: one(userTable, {
    fields: [userFollowUser.followerId],
    references: [userTable.id],
  }),
  followed: one(userTable, {
    fields: [userFollowUser.followedId],
    references: [userTable.id],
  }),
}));
