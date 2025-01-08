import dotenv from "dotenv";
import { app } from "./infra/app";
import logger from "./infra/logger";
import { runMigrations } from "./drizzle/migrate";

dotenv.config();

const startApp = async () => {
  await runMigrations();

  app.listen({ port: 8080, host: "0.0.0.0" }, (err, addr) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }

    logger.info(`Server running on ${addr}`);
  });
};

startApp();
