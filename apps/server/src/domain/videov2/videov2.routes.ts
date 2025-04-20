import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { summarizeVideo } from "./videov2.services";
import { SummarizeVideoBody } from "./videov2.types";

const tags = ["video"];

export const videoV2Routes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    "/summarize",
    {
      schema: {
        tags: tags,
        description: "Tóm tắt một video",
        body: SummarizeVideoBody,
      },
      config: {
        shouldSkipAuth: true,
      },
    },
    async (req) => {
      const res = await summarizeVideo(req.body);
      return res;
    }
  );
};
