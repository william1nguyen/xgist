import { Static, Type } from "@sinclair/typebox";
import { OptionalDefaultUndefined } from "~/infra/utils/schema";

export const FileUpload = Type.Any();
export type FileUpload = Static<typeof FileUpload>;

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

export const Video = Type.Object({
  id: Type.String({ format: "uuid" }),
  url: Type.String(),
  description: Type.String(),
  category: Type.String(),
  transcript: Type.String(),
  summary: Type.String(),
  createdBy: Type.String({ format: "uuid" }),
  likesCount: Type.Optional(Type.Number()),
});
export type Video = Static<typeof Video>;

export const GetVideoQueryString = Type.Object({
  page: Type.Number(),
  limit: Type.Number(),
});

export type GetVideoQueryString = Static<typeof GetVideoQueryString>;

export const GetUserVideoParams = Type.Object({
  userId: Type.String({ format: "uuid" }),
});

export type GetUserVideoParams = Static<typeof GetUserVideoParams>;

export const UploadVideoBody = Type.Object({
  file: Type.Any(),
  description: Type.Optional(Type.Object({ value: Type.String() })),
  viewable: Type.Optional(
    Type.Object({
      value: Type.Union([
        Type.Literal("public"),
        Type.Literal("private"),
        Type.Literal("friend"),
      ]),
    })
  ),
});

export type UploadVideoBody = Static<typeof UploadVideoBody>;

export const DeleteVideoParams = Type.Object({
  videoId: Type.String({ format: "uuid" }),
});

export type DeleteVideoParams = Static<typeof DeleteVideoParams>;

export const LikeVideoBody = Type.Object({
  videoId: Type.String(),
});
export type LikeVideoBody = Static<typeof LikeVideoBody>;

export const UnLikeVideoBody = Type.Object({
  videoId: Type.String(),
});
export type UnLikeVideoBody = Static<typeof UnLikeVideoBody>;
