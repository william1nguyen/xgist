import dotenv from "dotenv";
import { runMigrations } from "./drizzle/migrate";
import { app } from "./infra/app";
import { setupBackgroundJobs } from "./infra/jobs";
import logger from "./infra/logger";

dotenv.config();

const startApp = async () => {
  app.listen({ port: 8080, host: "0.0.0.0" }, (err, addr) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }

    logger.info(`Server running on ${addr}`);
  });
  runMigrations();
  setupBackgroundJobs();
};

startApp();
