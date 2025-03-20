import { Job, Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { summarizeBuffer } from "~/domain/video/video.services";
import { db } from "~/drizzle/db";
import { videoTable } from "~/drizzle/schema/video";
import { io } from "~/infra/app";
import logger from "~/infra/logger";
import { redisDefault, redisForBullMq } from "~/infra/redis";

export interface INotificationData {
  userId: string;
  videoName: string;
}

export interface ISummaryData {
  videoId: string;
  url: string;
  fileName: string;
  mimeType: string;
  encodedData: string;
  size: number;
  notification: INotificationData;
}

export interface INotification {
  id: string;
  key: string;
  timestamp: string;
  message: string;
  read: boolean;
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

const sendNotification = async (job: Job) => {
  try {
    const { userId, videoName } = job.data.notification;
    const { videoId } = job.data;
    const date = Date.now().toString();

    const key = `notifications:${userId}-${videoId}`;

    const notification = {
      id: job.id || `notification_${date}`,
      key,
      timestamp: date,
      message: `Video ${videoName} is summarized!`,
      read: false,
    };

    await redisDefault.lpush(key, JSON.stringify(notification));
    await redisDefault.expire(key, 60 * 60 * 24 * 7);

    io.socketsJoin(`users:${userId}`);
    io.to(`users:${userId}`).emit("notification", notification);

    logger.info({
      msg: "Notification sent",
      userId,
      notification,
    });
  } catch (error) {
    logger.error(`Failed to send notification from bullboard :${error}`);
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
  summaryWorker.on("completed", async (job) => {
    logger.info({ msg: "Job completed", jobId: job.id });
    await sendNotification(job);
  });

  summaryWorker.on("failed", (job, err) => {
    logger.error({ msg: "Job failed", jobId: job?.id, reason: err.message });
  });
  return summaryWorker;
};
