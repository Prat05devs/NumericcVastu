import {rm} from 'node:fs/promises';
import {createConnection} from 'mariadb';

/** All demo data from the browser run lives in commerce_e2e and is deleted with it. */
export default async function teardown() {
  const conn = await createConnection({host: '127.0.0.1', port: 3316, user: 'root', password: 'root'});
  await conn.query('DROP DATABASE IF EXISTS `commerce_e2e`');
  await conn.end();
  await rm('../api/.storage-e2e', {recursive: true, force: true});
}
