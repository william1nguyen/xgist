import { Job, Queue, Worker } from "bullmq";
import { Video } from "~/domain/video/video.types";
import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

export interface ISummaryData {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export const summaryQueue = new Queue<ISummaryData>("summary", {
  connection: redisForBullMq,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
  },
});

const handleSummaryJob = async (job: Job) => {};

export const createSummaryWorker = (): Worker => {
  const summaryWorker = new Worker<ISummaryData>(
    "summary",
    async (job) => {
      await handleSummaryJob(job);
      return;
    },
    {
      connection: redisForBullMq,
      concurrency: 1,
    }
  );
  summaryWorker.on("completed", (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
  });

  summaryWorker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });
  return summaryWorker;
};
