import { Job, Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { summarizeBuffer } from "~/domain/video/video.services";
import { db } from "~/drizzle/db";
import { videoTable } from "~/drizzle/schema/video";
import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

export interface ISummaryData {
  videoId: string;
  url: string;
  fileName: string;
  mimeType: string;
  encodedData: string;
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

const handleSummaryJob = async (job: Job) => {
  try {
    const { videoId, encodedData } = job.data;
    const buffer = Buffer.from(encodedData, "base64");
    const metadata = await summarizeBuffer(buffer);
    await db
      .update(videoTable)
      .set({
        isSummarized: true,
        metadata,
      })
      .where(eq(videoTable.id, videoId));
  } catch (error) {
    logger.error(`Summarize không thành công: ${error}`);
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
