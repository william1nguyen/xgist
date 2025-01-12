import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { uploadVideo } from "./video.services";
import { UploadVideoBody } from "./video.types";

const tags = ["video"];

export const videoRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    "",
    {
      schema: {
        consumes: ["multipart/form-data"],
        tags: tags,
        description: "Đăng tải một video mới",
        body: UploadVideoBody,
      },
    },
    async (req) => {
      const res = await uploadVideo(req.body);
      return res;
    }
  );
};
