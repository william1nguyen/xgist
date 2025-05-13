import { Job, Queue, Worker } from "bullmq";
import { extractKeyWords } from "~/domain/summary/summary.services";
import { db } from "~/drizzle/db";
import { keywordTable } from "~/drizzle/schema/media";
import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

export interface IKeywordData {
  mediaId: string;
  transcriptId: string;
  transcript: string;
}

export const keywordQueue = new Queue<IKeywordData>("keyword", {
  connection: redisForBullMq,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
  },
});

const handleKeywordJob = async (job: Job) => {
  try {
    const { mediaId, transcriptId, transcript } = job.data;
    const keywords = await extractKeyWords(transcript);
    if (keywords) {
      const keywordsToInsert = keywords.map((keyword) => ({
        transcriptId,
        mediaId,
        content: keyword,
      }));
      await db.insert(keywordTable).values(keywordsToInsert);
    }
  } catch (error) {
    throw error;
  }
};

export const createKeywordWorker = (): Worker => {
  const keywordWorker = new Worker<IKeywordData>(
    "keyword",
    async (job) => {
      await handleKeywordJob(job);
    },
    {
      connection: redisForBullMq,
      concurrency: 5,
    }
  );
  keywordWorker.on("completed", async (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
  });

  keywordWorker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });
  return keywordWorker;
};
