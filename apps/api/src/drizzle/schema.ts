import {relations} from 'drizzle-orm';
import {index, jsonb, pgEnum, timestamp} from 'drizzle-orm/pg-core';
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

export const mediaTypeEnum = pgEnum('media_type', [
  'DOCUMENT',
  'VIDEO',
  'AUDIO',
]);

export const mediaStateEnum = pgEnum('media_state', [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
]);

export const mediaTable = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .references(() => userTable.id)
      .notNull(),
    url: text('url').notNull(),
    name: text('name').notNull(),
    type: mediaTypeEnum('type').notNull().default('DOCUMENT'),
    state: mediaStateEnum('state').notNull().default('PENDING'),
    metadata: jsonb('metadata').$type<RowMetadata>(),
    ...commonFields,
  },
  (table) => ({
    userIdx: index('user_idx').on(table.userId),
  })
);

export const mediaRelations = relations(mediaTable, ({one}) => ({
  user: one(userTable, {
    fields: [mediaTable.userId],
    references: [userTable.id],
  }),
}));
