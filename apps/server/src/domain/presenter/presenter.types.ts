import { Static, Type } from "@sinclair/typebox";
import { BaseModelSchema } from "~/infra/utils/schema";

export const VideoPresenter = Type.Object({
  userId: Type.String(),
  mediaId: Type.String(),
  agentId: Type.String(),
  url: Type.String(),
  ...BaseModelSchema,
});

export type VideoPresenter = Static<typeof VideoPresenter>;

export const CreateVideoPresenterBody = Type.Object({
  content: Type.String(),
  mediaId: Type.String(),
  agentId: Type.String(),
});

export type CreateVideoPresenterBody = Static<typeof CreateVideoPresenterBody>;

export const GetVideoPresenterStatusParams = Type.Object({
  videoPresenterId: Type.String(),
});

export type GetVideoPresenterStatusParams = Static<
  typeof GetVideoPresenterStatusParams
>;
