#!/usr/bin/env node
/**
 * Build step for Hostinger's managed Node.js apps (docs/runbooks/hostinger-deployment.md). Hostinger installs the
 * pnpm workspace from this folder, then runs `pnpm run build`; each app's BUILD_TARGET variable (api | web) picks
 * what to build. `build:api` / `build:web` pass the target explicitly; with no target, every package is built.
 * Hostinger's Express preset runs no build command, so `postinstall` also calls this with --postinstall: it builds
 * when BUILD_TARGET is set (Hostinger) and does nothing otherwise (local installs, CI).
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
const postinstall = process.argv[2] === '--postinstall';
const target = (postinstall ? undefined : process.argv[2]) ?? process.env.BUILD_TARGET;
if (postinstall && !target) process.exit(0);
// Tools run from node_modules/.bin rather than through `pnpm`, which Hostinger's install step does not put on PATH.
const run = (tool, args, dir = '.') => {
  const cwd = join(root, dir);
  const bin = [join(cwd, 'node_modules/.bin', tool), join(root, 'node_modules/.bin', tool)].find((p) => existsSync(p));
  if (!bin) throw new Error(`${tool} is not installed (looked in ${dir}/node_modules/.bin and node_modules/.bin).`);
  console.log(`\n$ ${dir === '.' ? '' : `(${dir}) `}${tool} ${args}`);
  execSync(`"${bin}" ${args}`, {cwd, stdio: 'inherit', env: process.env});
};

if (target === 'api') {
  run('prisma', 'generate');
  run('tsc', '-p tsconfig.json', 'packages/contracts');
  run('tsc', '-p tsconfig.build.json', 'apps/api');
  if (process.env.SKIP_MIGRATIONS === 'true') {
    console.log('\nSKIP_MIGRATIONS=true: database left unchanged.');
  } else {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set; add it in hPanel → the API app → Environment variables.');
    run('prisma', 'migrate deploy');
    run('tsx', 'src/scripts/seed.ts', 'apps/api');
    const {BOOTSTRAP_OWNER_EMAIL: email, BOOTSTRAP_OWNER_NAME: name = 'Owner', STAFF_PASSWORD: password} = process.env;
    if (email) {
      if (!password) throw new Error('BOOTSTRAP_OWNER_EMAIL is set but STAFF_PASSWORD is not.');
      run('tsx', `src/scripts/create-staff.ts --if-missing ${JSON.stringify(email)} ${JSON.stringify(name)} OWNER`, 'apps/api');
    }
  }
} else if (target === 'web') {
  if (!process.env.API_INTERNAL_URL) throw new Error('API_INTERNAL_URL is not set; the /api/v1 proxy is fixed at build time.');
  run('tsc', '-p tsconfig.json', 'packages/contracts');
  run('next', 'build', 'apps/web');
  // next build's standalone output leaves static assets out; the server expects them beside it.
  const web = join(root, 'apps/web');
  const out = join(web, '.next/standalone/apps/web');
  cpSync(join(web, '.next/static'), join(out, '.next/static'), {recursive: true});
  if (existsSync(join(web, 'public'))) cpSync(join(web, 'public'), join(out, 'public'), {recursive: true});
  console.log(`\nStandalone server ready: ${join(out, 'server.js')}`);
} else if (!target) {
  execSync('pnpm run build:all', {cwd: root, stdio: 'inherit'});
} else {
  console.error(`Unknown BUILD_TARGET "${target}"; use api or web.`);
  process.exit(1);
}
