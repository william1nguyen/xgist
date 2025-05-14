import { Static, Type } from "@sinclair/typebox";
import { voiceEnum } from "~/drizzle/schema/agent";
import { createEnum } from "~/infra/utils/fns";
import { BaseModelSchema, OptionalDefaultNull } from "~/infra/utils/schema";

export const Agent = Type.Object({
  name: Type.String(),
  avatarUrl: Type.String(),
  voiceId: Type.Enum(createEnum(voiceEnum.enumValues)),
  videoUrl: Type.String(),
  ...BaseModelSchema,
});

export type Agent = Static<typeof Agent>;

export const GetAgentQueryString = Type.Object({
  page: Type.Optional(Type.Number()),
  size: Type.Optional(Type.Number()),
});

export type GetAgentQueryString = Static<typeof GetAgentQueryString>;

export const GetAgentResponse = Type.Object({
  data: Type.Array(Agent),
  metadata: Type.Object({
    page: Type.Number(),
    size: Type.Number(),
    total: Type.Number(),
  }),
});

export type GetAgentResponse = Static<typeof GetAgentResponse>;

export const GetAgentDetailParams = Type.Object({
  agentId: Type.String(),
});

export type GetAgentDetailParams = Static<typeof GetAgentDetailParams>;

export const GetAgentDetailResponse = Type.Object({
  data: Agent,
});

export type GetAgentDetailResponse = Static<typeof GetAgentDetailResponse>;

export const CreateAgentBody = Type.Object({
  name: Type.String(),
  avatarUrl: Type.String(),
  voiceId: Type.Enum(createEnum(voiceEnum.enumValues)),
  videoUrl: Type.String(),
});

export type CreateAgentBody = Static<typeof CreateAgentBody>;

export const CreateAgentResponse = Type.Object({
  data: Agent,
});

export type CreateAgentResponse = Static<typeof CreateAgentResponse>;
