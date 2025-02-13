import logger from "../logger";
import { createTranscribeWorker, transcribeQueue } from "./workers/transcribe";

const initWorkers = () => {
  logger.info("Create workers");
  createTranscribeWorker();
  logger.info("Workers created");
};

export const setupBackgroundJobs = () => {
  initWorkers();
};

export const queues = [transcribeQueue];
