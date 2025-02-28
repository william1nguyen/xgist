import logger from "../logger";

const initWorkers = () => {
  logger.info("Create workers");
  logger.info("Workers created");
};

export const setupBackgroundJobs = () => {
  initWorkers();
};

export const queues = [];
