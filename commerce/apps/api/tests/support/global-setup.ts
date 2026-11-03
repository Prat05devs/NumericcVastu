import {execSync} from 'node:child_process';
import {createConnection} from 'mariadb';

/** Creates a fresh commerce_test schema and applies the real migrations (no `db push`): tests run on the production schema. */
export default async function setup() {
  await prepare();
  return teardown; // Vitest runs the returned function after all test files
}

async function admin() {
  const url = new URL(process.env['TEST_DATABASE_URL'] ?? 'mysql://root:root@127.0.0.1:3316/commerce_test');
  const db = url.pathname.slice(1);
  if (!/^commerce_test\w*$/.test(db)) throw new Error(`Refusing to touch non-test database "${db}"`);
  return {url, db, conn: await createConnection({host: url.hostname, port: Number(url.port), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password)})};
}

/** After the run every test fixture is deleted: the whole test schema is dropped (KEEP_TEST_DB=1 keeps it for debugging). */
export async function teardown() {
  if (process.env['KEEP_TEST_DB'] === '1') return;
  const {db, conn} = await admin();
  await conn.query(`DROP DATABASE IF EXISTS \`${db}\``);
  await conn.end();
  const {rm} = await import('node:fs/promises');
  await rm(new URL('../../.storage-test', import.meta.url), {recursive: true, force: true});
}

async function prepare() {
  const {url, db, conn} = await admin();
  await conn.query(`DROP DATABASE IF EXISTS \`${db}\``);
  await conn.query(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  execSync('npx prisma migrate deploy', {cwd: new URL('../../../../', import.meta.url).pathname, env: {...process.env, DATABASE_URL: url.toString()}, stdio: 'pipe'});
  execSync('npx tsx src/scripts/seed.ts', {cwd: new URL('../../', import.meta.url).pathname, env: {...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), SESSION_SECRET: 'x'.repeat(40), ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'), CRON_JOB_SECRET: 'y'.repeat(40)}, stdio: 'pipe'});
}
