import { Static, Type } from "@sinclair/typebox";

export const FileUpload = Type.Any();
export type FileUpload = Static<typeof FileUpload>;

export const GeminiResponse = Type.Object({
  candidates: Type.Array(
    Type.Object({
      content: Type.Object({
        parts: Type.Array(
          Type.Object({
            text: Type.String(),
          }),
        ),
        role: Type.String(),
      }),
    }),
  ),
});
export type GeminiResponse = Static<typeof GeminiResponse>;

export const UploadVideoBody = Type.Object({
  file: FileUpload,
  videoId: Type.Object({
    value: Type.String(),
  }),
});
export type UploadVideoBody = Static<typeof UploadVideoBody>;
