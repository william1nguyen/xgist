import { db } from "~/drizzle/db";
import {
  CreateAgentBody,
  GetAgentDetailParams,
  GetAgentQueryString,
} from "./agent.types";
import { eq } from "drizzle-orm";
import { agentTable } from "~/drizzle/schema/agent";
import { AgentNotFoundError, CreateAgentFailedError } from "./agent.errors";
import _ from "lodash";

export const getAgents = async ({
  page = 1,
  size = 10,
}: GetAgentQueryString) => {
  const offset = (page - 1) * size;
  const agents = await db.query.agentTable.findMany({
    limit: size,
    offset,
  });

  const total = (await db.query.agentTable.findMany()).length;

  return {
    data: agents,
    metadata: {
      page,
      size,
      total,
    },
  };
};

export const getAgentDetail = async ({ agentId }: GetAgentDetailParams) => {
  const agent = await db.query.agentTable.findFirst({
    where: eq(agentTable.id, agentId),
  });

  if (!agent) {
    throw new AgentNotFoundError();
  }

  return {
    data: agent,
  };
};

export const createAgent = async ({
  name,
  avatarUrl,
  voiceId,
  videoUrl,
}: CreateAgentBody) => {
  const agent = _.first(
    await db
      .insert(agentTable)
      .values({
        name,
        avatarUrl,
        voiceId,
        videoUrl,
      })
      .returning()
  );

  if (!agent) {
    throw new CreateAgentFailedError();
  }

  return {
    data: agent,
  };
};
