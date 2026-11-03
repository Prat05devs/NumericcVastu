import './env.ts';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {createDb, migrate} from '../src/lib/db.ts';
import {hashPassword} from '../src/lib/crypto.ts';

/**
 * npm run admin:create: creates a back office account (owner by default) or resets its password.
 * Usage: npm run admin:create -- you@example.com "Your Name" [owner|admin|marketing]
 */
const [email, name = 'Owner', role = 'owner'] = process.argv.slice(2);
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !['owner', 'admin', 'marketing'].includes(role)) {
  console.error('Usage: npm run admin:create -- you@example.com "Your Name" [owner|admin|marketing]');
  process.exit(1);
}
const rl = createInterface({input: process.stdin, output: process.stdout});
const password = await rl.question('Password (at least 12 characters): ');
rl.close();
if (password.length < 12) { console.error('Too short.'); process.exit(1); }
const db = createDb();
await migrate(db);
await db.execute(
  `INSERT INTO admin_users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), active = 1, failed_logins = 0, locked_until = NULL`,
  [randomUUID(), email.toLowerCase(), name, await hashPassword(password), role],
);
console.log(`${role} account ready for ${email.toLowerCase()}.`);
await db.close();
