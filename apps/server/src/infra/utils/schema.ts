import {
  type Static,
  type TArray,
  type TLiteral,
  type TObject,
  type TSchema,
  type TUnion,
  Type,
} from "@sinclair/typebox";

export interface BaseModel<T = string> {
  id: T;
  createdAt: string;
  updatedAt: string;
}

export const OptionalDefaultNull = (ts: TSchema) =>
  Type.Optional(Type.Union([Type.Null(), ts]));

export const OptionalDefaultUndefined = (ts: TSchema) =>
  Type.Optional(Type.Union([Type.Undefined(), ts]));

export const BaseModelSchema = {
  id: Type.String(),
  createdTime: OptionalDefaultNull(Type.String()),
  updatedTime: OptionalDefaultNull(Type.String()),
  deletedTime: OptionalDefaultNull(Type.String()),
};

type IntoStringLiteralUnion<T> = {
  [K in keyof T]: T[K] extends string ? TLiteral<T[K]> : never;
};

export function EnumType<T extends string[]>(
  values: [...T]
): TUnion<IntoStringLiteralUnion<T>> {
  return {
    enum: [...values],
    type: "string",
  } as any;
}

export const createListResponseSchema = <T extends TObject>(
  listKey: string,
  itemSchema: T
) =>
  Type.Object({
    data: Type.Object({
      [listKey]: Type.Optional(Type.Array(itemSchema)),
    }),
    metadata: Type.Optional(
      Type.Object({
        page: Type.Number(),
        size: Type.Number(),
        total: Type.Number(),
      })
    ),
  });

export const createItemResponseSchema = <T extends TObject | TArray | TLiteral>(
  key: string,
  itemSchema: T
) =>
  Type.Object({
    data: Type.Object({
      [key]: itemSchema,
    }),
  });

export const FileSchema = Type.Object({
  url: Type.String(),
});

export const ImageSchema = FileSchema;
export const VideoSchema = FileSchema;

export const GetQueryString = Type.Object({
  q: Type.Optional(Type.String()),
  page: Type.Optional(Type.Number()),
  size: Type.Optional(Type.Number()),
});
export type GetQueryString = Static<typeof GetQueryString>;

export const File = Type.Any();
export type File = Static<typeof File>;
