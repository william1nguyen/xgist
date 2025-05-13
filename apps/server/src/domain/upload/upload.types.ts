import { Static, Type } from "@sinclair/typebox";
import { WhisperTranscript } from "../media/media.types";
import { OptionalDefaultNull } from "~/infra/utils/schema";

export const File = Type.Any();
export type File = Static<typeof File>;

export const UploadBody = Type.Object({
  file: File,
  folder: Type.Optional(
    Type.Object({
      value: Type.String(),
    })
  ),
  fileType: Type.Object({
    value: Type.Union([
      Type.Literal("image"),
      Type.Literal("audio"),
      Type.Literal("video"),
    ]),
  }),
});

export type UploadBody = Static<typeof UploadBody>;

export const UploadResponse = Type.Object({
  url: Type.String(),
  fileName: Type.String(),
  mimeType: Type.String(),
  size: Type.Number(),
  transcript: OptionalDefaultNull(WhisperTranscript),
});

export type UploadResponse = Static<typeof UploadResponse>;
