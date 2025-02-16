import { Static, Type } from "@sinclair/typebox";
import {
  BaseModelSchema,
  createItemResponseSchema,
  createListResponseSchema,
  OptionalDefaultNull,
} from "~/infra/utils/schema";

export const FileUpload = Type.Any();
export type FileUpload = Static<typeof FileUpload>;

export const Comment = Type.Object({
  videoId: Type.String(),
  content: Type.String(),
  userId: Type.String(),
  ...BaseModelSchema,
});
export type Comment = Static<typeof Comment>;

export const Like = Type.Object({
  videoId: Type.String(),
  userId: Type.String(),
  ...BaseModelSchema,
});
export type Like = Static<typeof Like>;

export const Video = Type.Object({
  title: Type.String(),
  description: Type.String(),
  thumbnailUrl: OptionalDefaultNull(Type.String()),
  transcripts: OptionalDefaultNull(Type.Array(Type.String())),
  tags: OptionalDefaultNull(Type.Array(Type.String())),
  userId: Type.String(),
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
  file: FileUpload,
  thumbnail: FileUpload,
  title: Type.Object({
    value: Type.String(),
  }),
  description: Type.Object({
    value: Type.String(),
  }),
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

export const CreateCommentBody = Type.Object({
  videoId: Type.String(),
  content: Type.String(),
});
export type CreateCommentBody = Static<typeof CreateCommentBody>;

export const CreateCommentResponse = createItemResponseSchema(
  "comment",
  Comment
);
export type CreateCommentResponse = Static<typeof CreateCommentResponse>;

export const GetCommentsParams = Type.Object({
  videoId: Type.String(),
});
export type GetCommentsParams = Static<typeof GetCommentsParams>;

export const GetCommentsResponse = createListResponseSchema(
  "comments",
  Comment
);

export const ToggleLikeVideoBody = Type.Object({
  videoId: Type.String(),
});
export type ToggleLikeVideoBody = Static<typeof ToggleLikeVideoBody>;

export const ToggleLikeVideoResponse = createItemResponseSchema("like", Like);
export type ToggleLikeVideoResponse = Static<typeof ToggleLikeVideoResponse>;
