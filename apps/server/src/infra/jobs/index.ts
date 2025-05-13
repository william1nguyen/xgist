import logger from "../logger";
import { createKeypointWorker, keypointQueue } from "./workers/keypoint";
import { createKeywordWorker, keywordQueue } from "./workers/keyword";
import { createSummaryWorker, summaryQueue } from "./workers/summary";

const initWorkers = () => {
  logger.info("Create workers");
  createKeywordWorker();
  createKeypointWorker();
  createSummaryWorker();
  logger.info("Workers created");
};

export const setupBackgroundJobs = () => {
  initWorkers();
};

export const queues = [keywordQueue, keypointQueue, summaryQueue];
