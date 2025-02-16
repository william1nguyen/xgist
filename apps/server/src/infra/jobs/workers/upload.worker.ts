import { type Job, Queue, Worker } from "bullmq";
import { handleUploadVideo } from "~/domain/video/services/utils/upload";
import { env } from "~/env";
import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

interface ITUpload {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileName: string;
  encodedData: string;
  userId: string;
}

export const uploadQueue = new Queue<ITUpload>("upload", {
  connection: redisForBullMq,
  defaultJobOptions: {
    attempts: 5,
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

const handleUploadJob = async (job: Job) => {
  const {
    title,
    description,
    thumbnailUrl,
    mimeType,
    fileName,
    encodedData,
    userId,
  } = job.data as ITUpload;
  const decodedData = Buffer.from(encodedData, "base64");
  const res = await handleUploadVideo(
    title,
    description,
    thumbnailUrl,
    mimeType,
    fileName,
    decodedData,
    userId
  );
  return res;
};

export const createUploadWorker = () => {
  const worker = new Worker(
    "upload",
    async (job) => {
      await handleUploadJob(job);
    },
    {
      connection: redisForBullMq,
      concurrency: env.REDIS_MAX_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });

  return worker;
};
