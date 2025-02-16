import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";
import type { Queue } from "bullmq";
import type { FastifyPluginAsync } from "fastify";

export const bullBoardPlugin: FastifyPluginAsync<{
  queues: Queue[];
  path?: string;
}> = async (app, { queues, path = "/bullboard" }) => {
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: queues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  serverAdapter.setBasePath(path);
  app.register(serverAdapter.registerPlugin(), {
    prefix: path,
    basePath: path,
  });
};
