import {createApp} from './app.js';
import {env} from './config/env.js';
import {prisma} from './lib/db.js';
import {logger} from './lib/logger.js';

const config = env();
const server = createApp().listen(config.PORT, () => logger.info({port: config.PORT, env: config.NODE_ENV}, 'commerce API listening'));
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

async function shutdown(signal: string) {
  logger.info({signal}, 'shutting down');
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
