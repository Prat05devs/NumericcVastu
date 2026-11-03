#!/usr/bin/env node
/**
 * Build step for Hostinger's managed Node.js apps (docs/runbooks/hostinger-deployment.md). Hostinger installs the
 * pnpm workspace from this folder, then runs `pnpm run build:api` or `pnpm run build:web`, which call this script.
 *
 *   api → prisma generate, build contracts + API, then (unless SKIP_MIGRATIONS=true) apply migrations, seed the base
 *         taxonomy (idempotent) and, when BOOTSTRAP_OWNER_EMAIL + STAFF_PASSWORD are set, create the owner if missing.
 *         Entry file: apps/api/dist/server.js
 *   web → build contracts + Next standalone server, copy its static assets beside it.
 *         Entry file: apps/web/.next/standalone/apps/web/server.js
 */
import {execSync} from 'node:child_process';
import {cpSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
const run = (cmd, cwd = root) => { console.log(`\n$ ${cmd}`); execSync(cmd, {cwd, stdio: 'inherit', env: process.env}); };

if (target === 'api') {
  run('pnpm exec prisma generate');
  run('pnpm --filter @sc/contracts build');
  run('pnpm --filter api build');
  if (process.env.SKIP_MIGRATIONS === 'true') {
    console.log('\nSKIP_MIGRATIONS=true: database left unchanged.');
  } else {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set; add it in hPanel → the API app → Environment variables.');
    run('pnpm exec prisma migrate deploy');
    run('pnpm exec tsx src/scripts/seed.ts', join(root, 'apps/api'));
    const {BOOTSTRAP_OWNER_EMAIL: email, BOOTSTRAP_OWNER_NAME: name = 'Owner', STAFF_PASSWORD: password} = process.env;
    if (email) {
      if (!password) throw new Error('BOOTSTRAP_OWNER_EMAIL is set but STAFF_PASSWORD is not.');
      run(`pnpm exec tsx src/scripts/create-staff.ts --if-missing ${JSON.stringify(email)} ${JSON.stringify(name)} OWNER`, join(root, 'apps/api'));
    }
  }
} else if (target === 'web') {
  if (!process.env.API_INTERNAL_URL) throw new Error('API_INTERNAL_URL is not set; the /api/v1 proxy is fixed at build time.');
  run('pnpm --filter @sc/contracts build');
  run('pnpm --filter web build');
  // next build's standalone output leaves static assets out; the server expects them beside it.
  const web = join(root, 'apps/web');
  const out = join(web, '.next/standalone/apps/web');
  cpSync(join(web, '.next/static'), join(out, '.next/static'), {recursive: true});
  if (existsSync(join(web, 'public'))) cpSync(join(web, 'public'), join(out, 'public'), {recursive: true});
  console.log(`\nStandalone server ready: ${join(out, 'server.js')}`);
} else {
  console.error('Usage: node scripts/hostinger-build.mjs <api|web>');
  process.exit(1);
}
