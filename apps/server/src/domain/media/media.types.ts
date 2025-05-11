import { Static, Type } from "@sinclair/typebox";
import { BaseModelSchema, OptionalDefaultNull } from "~/infra/utils/schema";

export const Media = Type.Object({
  url: Type.String(),
  title: Type.String(),
  description: OptionalDefaultNull(Type.String()),
  thumbnail: Type.String(),
  userId: Type.String(),
  category: Type.String(),
  ...BaseModelSchema,
});

export type Media = Static<typeof Media>;

export const MediaInfo = Type.Object({});

export type MediaInfo = Static<typeof MediaInfo>;

export const SearchMediaHistory = Type.Object({
  keyword: Type.String(),
});

export const GetSearchMediaHistoryQueryString = Type.Object({
  page: Type.Number(),
  size: Type.Number(),
});

export type GetSearchMediaHistoryQueryString = Static<
  typeof GetSearchMediaHistoryQueryString
>;

export const GetSearchMediaHistoryResponse = Type.Object({
  data: Type.Array(SearchMediaHistory),
  metadata: Type.Object({
    page: Type.Number(),
    size: Type.Number(),
    total: Type.Number(),
  }),
});

export type GetSearchMediaHistoryResponse = Static<
  typeof GetSearchMediaHistoryResponse
>;

export const SearchMediaQueryString = Type.Object({
  keyword: Type.Optional(Type.String()),
  page: Type.Optional(Type.Number()),
  size: Type.Optional(Type.Number()),
});

export type SearchMediaQueryString = Static<typeof SearchMediaQueryString>;

export const SearchMediaResponse = Type.Object({
  data: Type.Array(Media),
  metadata: Type.Object({
    page: Type.Number(),
    size: Type.Number(),
    total: Type.Number(),
  }),
});

export type SearchMediaResponse = Static<typeof SearchMediaResponse>;

export const GetMediaDetailParams = Type.Object({
  mediaId: Type.String(),
});

export type GetMediaDetailParams = Static<typeof GetMediaDetailParams>;

export const GetMediaDetailResponse = Type.Object({
  data: Type.Intersect([Media, MediaInfo]),
});

export type GetMediaDetailResponse = Static<typeof GetMediaDetailResponse>;

export const CreateMediaBody = Type.Object({
  videoUrl: Type.String(),
  thumbnailUrl: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  category: Type.String(),
});

export type CreateMediaBody = Static<typeof CreateMediaBody>;

export const CreateMediaResponse = Type.Object({
  data: Media,
});

export type CreateMediaResponse = Static<typeof CreateMediaResponse>;

export const UpdateMediaBody = Type.Object({
  mediaId: Type.String(),
  views: Type.Optional(Type.Number()),
  isSummarized: Type.Optional(Type.Boolean()),
});

export type UpdateMediaBody = Static<typeof UpdateMediaBody>;

export const ToggleLikeParams = Type.Object({
  mediaId: Type.String(),
});

export type ToggleLikeParams = Static<typeof ToggleLikeParams>;

export const ToggleBookmarkParams = Type.Object({
  mediaId: Type.String(),
});

export type ToggleBookmarkParams = Static<typeof ToggleBookmarkParams>;
