import { type Job, Queue, Worker } from "bullmq";
import { handleUploadFile } from "~/domain/video/video.services";
import { FileUpload } from "~/domain/video/video.types";
import { env } from "~/env";
import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

interface ITranscribe {
  videoId: string;
  mimeType: string;
  fileName: string;
  encodedData: string;
}

export const transcribeQueue = new Queue<ITranscribe>("transcribe", {
  connection: redisForBullMq,
  defaultJobOptions: {
    attempts: 5,
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

const handleTranscribeJob = async (job: Job) => {
  const { videoId, mimeType, fileName, encodedData } = job.data as ITranscribe;
  const decodedData = Buffer.from(encodedData, "base64");
  const res = await handleUploadFile(videoId, mimeType, fileName, decodedData);
  return res;
};

export const createTranscribeWorker = () => {
  const worker = new Worker(
    "transcribe",
    async (job) => {
      await handleTranscribeJob(job);
    },
    {
      connection: redisForBullMq,
      concurrency: env.REDIS_MAX_CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });

  return worker;
};
