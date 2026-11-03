import {execSync} from 'node:child_process';
import {createConnection} from 'mariadb';
import {apiEnv} from '../../playwright.config';

export default async function setup() {
  const conn = await createConnection({host: '127.0.0.1', port: 3316, user: 'root', password: 'root'});
  await conn.query('DROP DATABASE IF EXISTS `commerce_e2e`');
  await conn.query('CREATE DATABASE `commerce_e2e` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.end();
  const env = {...process.env, ...apiEnv};
  execSync('npx prisma migrate deploy', {cwd: '../..', env, stdio: 'pipe'});
  execSync('npx tsx src/scripts/seed.ts --demo', {cwd: '../api', env, stdio: 'pipe'});
  execSync('npx tsx src/scripts/create-staff.ts owner-e2e@example.test "E2E Owner" OWNER', {cwd: '../api', env: {...env, STAFF_PASSWORD: 'e2e owner passphrase 2026'}, stdio: 'pipe'});
}
