import { createError } from "~/infra/utils/errors";

enum ErrorCode {
  AgentNotFound = "AgentNotFoundError",
  CreateAgentFailed = "CreateAgentFailedError",
}

export const AgentNotFoundError = createError(
  ErrorCode.AgentNotFound,
  "Agent not found!",
  404
);

export const CreateAgentFailedError = createError(
  ErrorCode.CreateAgentFailed,
  "Failed to create agent",
  500
);
