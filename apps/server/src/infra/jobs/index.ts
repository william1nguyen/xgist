import logger from "../logger";
import { createUploadWorker, uploadQueue } from "./workers/upload.worker";

const initWorkers = () => {
  logger.info("Create workers");
  createUploadWorker();
  logger.info("Workers created");
};

export const setupBackgroundJobs = () => {
  initWorkers();
};

export const queues = [uploadQueue];
