import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { createVideo } from "./video.services";
import { UploadVideoBody } from "./video.types";

const tags = ["video"];

export const videoRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    "",
    {
      schema: {
        tags: tags,
        description: "Đăng tải một video mới",
        consumes: ["multipart/form-data"],
        body: UploadVideoBody,
      },
    },
    async (req) => {
      const res = await createVideo(req.body);
      return res;
    }
  );
};
