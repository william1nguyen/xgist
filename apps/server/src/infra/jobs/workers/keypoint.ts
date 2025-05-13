import { Job, Queue, Worker } from "bullmq";
import { extractKeyPoints } from "~/domain/video/video.services";
import { db } from "~/drizzle/db";
import { keypointTable } from "~/drizzle/schema/media";
import logger from "~/infra/logger";
import { redisForBullMq } from "~/infra/redis";

export interface IKeypointData {
  mediaId: string;
  transcriptId: string;
  transcript: string;
}

export const keypointQueue = new Queue<IKeypointData>("keypoint", {
  connection: redisForBullMq,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
  },
});

const handleKeypointJob = async (job: Job) => {
  try {
    const { mediaId, transcriptId, transcript } = job.data;

    const keypoints = await extractKeyPoints(transcript);
    if (keypoints) {
      const keypointsToInsert = keypoints.map((keypoint) => ({
        transcriptId,
        mediaId,
        content: keypoint,
      }));
      await db.insert(keypointTable).values(keypointsToInsert);
    }
  } catch (error) {
    throw error;
  }
};

export const createKeypointWorker = (): Worker => {
  const keypointWorker = new Worker<IKeypointData>(
    "keypoint",
    async (job) => {
      await handleKeypointJob(job);
    },
    {
      connection: redisForBullMq,
      concurrency: 5,
    }
  );
  keypointWorker.on("completed", async (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
  });

  keypointWorker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });
  return keypointWorker;
};
