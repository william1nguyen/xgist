import { Static, Type } from "@sinclair/typebox";
import { BaseModelSchema } from "~/infra/utils/schema";

export const Summary = Type.Object({
  mediaId: Type.String(),
  transcriptId: Type.String(),
  content: Type.String(),
  ...BaseModelSchema,
});

export type Summary = Static<typeof Summary>;

export const UpdateSummaryInfoBody = Type.Object({});

export type UpdateSummaryInfoBody = Static<typeof UpdateSummaryInfoBody>;
