import logger from "../logger";
import { createSummaryWorker, summaryQueue } from "./workers/summarize";

const initWorkers = () => {
  logger.info("Create workers");
  createSummaryWorker();
  logger.info("Workers created");
};

export const setupBackgroundJobs = () => {
  initWorkers();
};

export const queues = [summaryQueue];
