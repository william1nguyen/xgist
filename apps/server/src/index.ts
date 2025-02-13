import dotenv from 'dotenv';
import {app} from './infra/app';
import logger from './infra/logger';
import {setupBackgroundJobs} from './infra/jobs';
import { runMigrations } from './drizzle/migrate';

dotenv.config();

const startApp = async () => {
  app.listen({port: 8000, host: '0.0.0.0'}, (err, addr) => {
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
