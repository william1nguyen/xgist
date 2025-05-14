import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  CreateAgentBody,
  CreateAgentResponse,
  GetAgentDetailParams,
  GetAgentDetailResponse,
  GetAgentQueryString,
  GetAgentResponse,
} from "./agent.types";
import { createAgent, getAgentDetail, getAgents } from "./agent.services";

const tags = ["agent"];

export const agentRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "",
    {
      schema: {
        tags,
        description: "Get all agents",
        querystring: GetAgentQueryString,
        response: {
          200: GetAgentResponse,
        },
      },
    },
    async (req) => {
      const res = await getAgents(req.query);
      return res;
    }
  );

  app.get(
    "/:agentId",
    {
      schema: {
        tags,
        description: "Get agent detail",
        params: GetAgentDetailParams,
        response: {
          200: GetAgentDetailResponse,
        },
      },
    },
    async (req) => {
      const res = await getAgentDetail(req.params);
      return res;
    }
  );

  app.post(
    "",
    {
      schema: {
        tags,
        description: "Create new agent",
        body: CreateAgentBody,
        response: {
          200: CreateAgentResponse,
        },
      },
    },
    async (req) => {
      const res = await createAgent(req.body);
      return res;
    }
  );
};
