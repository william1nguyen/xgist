import { jsonb, timestamp } from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

interface Actor {
  id?: string;
  username?: string;
}

export const commonFields = {
  createdTime: timestamptz("created_time").notNull().defaultNow(),
  updatedTime: timestamptz("updated_time").$onUpdate(() => new Date()),
  deletedTime: timestamptz("deleted_time"),
  createdBy: jsonb("created_by").$type<Actor>(),
  updatedBy: jsonb("updated_by").$type<Actor>(),
  deletedBy: jsonb("deleted_by").$type<Actor>(),
};
