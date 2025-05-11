import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { UploadBody, UploadResponse } from "./upload.types";
import { uploadAudio, uploadImage, uploadVideo } from "./upload.services";

const tags = ["upload"];

export const uploadRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    "",
    {
      schema: {
        tags,
        description: "Upload file to MinIO",
        consumes: ["multipart/form-data"],
        body: UploadBody,
        response: {
          200: UploadResponse,
        },
      },
    },
    async (req) => {
      const { file, folder, fileType } = req.body;
      switch (fileType.value) {
        case "image":
          return await uploadImage(file, folder?.value);
        case "audio":
          return await uploadAudio(file, folder?.value);
        case "video":
          return await uploadVideo(file, folder?.value);
      }
    }
  );
};
