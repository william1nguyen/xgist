import {type SQL, and, eq, isNull, sql} from 'drizzle-orm';
import type {AnyPgColumn, PgColumn} from 'drizzle-orm/pg-core';

export const withoutDeleted = (
  table: {deletedTime: PgColumn},
  ...conditions: (SQL<unknown> | undefined)[]
) => {
  const notDeleted = isNull(table.deletedTime);
  if (conditions.length === 0) {
    return notDeleted;
  }

  return and(...conditions, notDeleted);
};

export const withoutTesting = (
  table: {isTesting: PgColumn},
  ...conditions: (SQL<unknown> | undefined)[]
) => {
  const notTesting = eq(table.isTesting, false);
  if (conditions.length === 0) {
    return notTesting;
  }

  return and(...conditions, notTesting);
};

export function lower(col: AnyPgColumn): SQL {
  return sql`lower(${col})`;
}
