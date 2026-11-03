import {PrismaMariaDb} from '@prisma/adapter-mariadb';
import {PrismaClient} from '../generated/prisma/client.js';
import {env} from '../config/env.js';

/**
 * One bounded pool per process (Hostinger publishes 75 connections per DB user; we use a handful).
 * Only the API process imports this module; the web app never touches MySQL (ADR-01/02).
 */
function config(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname, port: Number(u.port || 3306), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''), connectionLimit: env().DATABASE_POOL_SIZE, timezone: 'Z' as const,
    ...(u.searchParams.get('ssl') === 'true' && {ssl: {rejectUnauthorized: true}}),
  };
}

const holder = globalThis as unknown as {__scPrisma?: PrismaClient};
export const prisma: PrismaClient = holder.__scPrisma ?? new PrismaClient({adapter: new PrismaMariaDb(config(env().DATABASE_URL))});
if (env().NODE_ENV !== 'production') holder.__scPrisma = prisma;

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
