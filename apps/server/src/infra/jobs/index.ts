import logger from "../logger";
import {
  createPingWorker,
  pingQueue,
  startCronPingJob,
} from "./workers/pingGemini";
import { createSummaryWorker, summaryQueue } from "./workers/summarize";

const initWorkers = () => {
  logger.info("Create workers");
  createPingWorker();
  createSummaryWorker();
  logger.info("Workers created");
};

export const setupBackgroundJobs = () => {
  initWorkers();
  startCronPingJob();
};

export const queues = [pingQueue, summaryQueue];
