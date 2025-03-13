import { Job, Queue, Worker } from "bullmq";
import { checkGeminiHealth } from "~/infra/gemini";

import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

export const pingQueue = new Queue("ping", {
  connection: redisForBullMq,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
  },
});

const handlePingJob = async (job: Job) => {
  await checkGeminiHealth();
};

export const createPingWorker = (): Worker => {
  const pingWorker = new Worker(
    "ping",
    async (job) => {
      await handlePingJob(job);
    },
    {
      connection: redisForBullMq,
      concurrency: 1,
    }
  );
  pingWorker.on("completed", (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
  });

  pingWorker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });
  return pingWorker;
};
