import { Static, Type } from "@sinclair/typebox";
import { BaseModelSchema } from "~/infra/utils/schema";
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

export const Chunk = Type.Object({
  time: Type.Number(),
  text: Type.String(),
});
export type Chunk = Static<typeof Chunk>;

export const Transcript = Type.Object({
  text: Type.String(),
  chunks: Type.Array(Chunk),
});
export type Transcript = Static<typeof Transcript>;

export const SummarizeVideoBody = Type.Object({
  videoFile: File,
});
export type SummarizeVideoBody = Static<typeof SummarizeVideoBody>;
