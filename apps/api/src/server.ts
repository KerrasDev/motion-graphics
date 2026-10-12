import { buildApp } from './app';
import { env } from './config/env';

const app = await buildApp();

const start = async () => {
  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
