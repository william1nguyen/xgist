import logger from "../logger";
import { createSummaryWorker, summaryQueue } from "./workers/summarize";
import { observeBullQueue } from "../metrics";

const initWorkers = () => {
  logger.info("Create workers");
  createSummaryWorker();
  logger.info("Workers created");
};

export const setupBackgroundJobs = () => {
  initWorkers();
  // Periodically observe BullMQ queue sizes for Prometheus
  const queueName = "summary";
  const INTERVAL_MS = 5000;
  setInterval(async () => {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        summaryQueue.getWaitingCount(),
        summaryQueue.getActiveCount(),
        summaryQueue.getCompletedCount(),
        summaryQueue.getFailedCount(),
        summaryQueue.getDelayedCount(),
      ]);
      observeBullQueue(queueName, {
        waiting,
        active,
        completed,
        failed,
        delayed,
      });
    } catch (e) {
      logger.error(e);
    }
  }, INTERVAL_MS);
};

export const queues = [summaryQueue];
