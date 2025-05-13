import { Job, Queue, Worker } from "bullmq";
import { summarize } from "~/domain/video/video.services";
import { db } from "~/drizzle/db";
import { summaryTable } from "~/drizzle/schema/media";
import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

export interface ISummaryData {
  mediaId: string;
  transcriptId: string;
  transcript: string;
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

const handleSummaryJob = async (job: Job) => {
  try {
    const { mediaId, transcriptId, transcript } = job.data;

    const summary = await summarize(transcript);
    if (summary) {
      await db.insert(summaryTable).values({
        mediaId,
        transcriptId,
        content: summary,
      });
    }
  } catch (error) {
    throw error;
  }
};

export const createSummaryWorker = (): Worker => {
  const summaryWorker = new Worker<ISummaryData>(
    "summary",
    async (job) => {
      await handleSummaryJob(job);
    },
    {
      connection: redisForBullMq,
      concurrency: 5,
    }
  );
  summaryWorker.on("completed", async (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
  });

  summaryWorker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });
  return summaryWorker;
};
