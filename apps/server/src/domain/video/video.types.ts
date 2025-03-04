import { Static, Type } from "@sinclair/typebox";
import {
  BaseModelSchema,
  createItemResponseSchema,
  createListResponseSchema,
} from "~/infra/utils/schema";
import { User } from "../user/user.types";
import { createEnum } from "~/infra/utils/fns";
import { videoCategory } from "~/drizzle/schema/video";
import { File } from "~/infra/utils/schema";

export const Category = Type.Enum(createEnum(videoCategory.enumValues));

export const Video = Type.Object({
  url: Type.String(),
  title: Type.String(),
  description: Type.String(),
  thumbnail: Type.String(),
  userId: Type.String(),
  category: Category,
  duration: Type.Number(),
  views: Type.Number(),
  likes: Type.Number(),
  isSummarized: Type.Boolean(),
  metadata: Type.Optional(Type.Any()),
  creator: User,
  ...BaseModelSchema,
});
export type Video = Static<typeof Video>;

export const GeminiResponse = Type.Object({
  candidates: Type.Array(
    Type.Object({
      content: Type.Object({
        parts: Type.Array(
          Type.Object({
            text: Type.String(),
          })
        ),
        role: Type.String(),
      }),
    })
  ),
});
export type GeminiResponse = Static<typeof GeminiResponse>;

export const UploadVideoBody = Type.Object({
  videoFile: File,
  thumbnailFile: File,
  title: Type.Object({ value: Type.String() }),
  description: Type.Object({ value: Type.String() }),
  category: Type.Object({ value: Category }),
});
export type UploadVideoBody = Static<typeof UploadVideoBody>;

export const GetVideosResponse = createListResponseSchema("videos", Video);
export type GetVideosResponse = Static<typeof GetVideosResponse>;

export const GetVideoDetailParams = Type.Object({
  videoId: Type.String(),
});
export type GetVideoDetailParams = Static<typeof GetVideoDetailParams>;

export const GetVideoDetailResponse = createItemResponseSchema("video", Video);
export type GetVideoDetailResponse = Static<typeof GetVideoDetailParams>;

export const GetRelatedVideosParams = Type.Object({
  videoId: Type.String(),
  page: Type.Optional(Type.Number()),
  size: Type.Optional(Type.Number()),
});
export type GetRelatedVideosParams = Static<typeof GetRelatedVideosParams>;

export const ToggleLikeParams = Type.Object({
  videoId: Type.String(),
});
export type ToggleLikeParams = Static<typeof ToggleLikeParams>;

export const ToggleBookmarkParams = Type.Object({
  videoId: Type.String(),
});
export type ToggleBookmarkParams = Static<typeof ToggleBookmarkParams>;
