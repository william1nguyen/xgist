import {jsonb, timestamp} from 'drizzle-orm/pg-core';
import {pgTable, text, uuid} from 'drizzle-orm/pg-core';
import type {AnyRecord} from '~/infra/utils/types';

const timestamptz = (name: string) => timestamp(name, {withTimezone: true});

export type RowMetadata = AnyRecord;

export const commonFields = {
  createdTime: timestamptz('created_time').notNull().defaultNow(),
  updatedTime: timestamptz('updated_time').$onUpdate(() => new Date()),
  deletedTime: timestamptz('deleted_time'),
};

export const userTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  keycloakUserId: uuid('keycloak_user_id').notNull(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  metadata: jsonb('metadata'),
  ...commonFields,
});
