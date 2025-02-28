import { jsonb, timestamp } from "drizzle-orm/pg-core";
import { AnyRecord } from "~/infra/utils/types";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export type RowMetadata = AnyRecord;

export const commonFields = {
  createdTime: timestamptz("created_time").notNull().defaultNow(),
  updatedTime: timestamptz("updated_time").$onUpdate(() => new Date()),
  deletedTime: timestamptz("deleted_time"),
};
