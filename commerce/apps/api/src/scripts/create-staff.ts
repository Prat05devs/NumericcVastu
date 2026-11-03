/**
 * Bootstrap or add a staff account from the server shell (no default credentials exist anywhere):
 *   STAFF_PASSWORD='…' pnpm --filter api exec tsx --env-file-if-exists=../../.env src/scripts/create-staff.ts owner@example.com "Owner Name" OWNER
 * The person enrols an authenticator app at first sign-in; nothing in the back office works until they do.
 */
import {STAFF_ROLES} from '@sc/contracts';
import {randomBytes} from 'node:crypto';
import {prisma} from '../lib/db.js';
import {hashPassword} from '../lib/crypto.js';
import {ulid} from '../lib/ids.js';

// --if-missing: succeed quietly when the account exists (used by the Hostinger build to bootstrap the owner).
const ifMissing = process.argv.includes('--if-missing');
const [email, name, role = 'OWNER'] = process.argv.slice(2).filter((a) => a !== '--if-missing');
if (!email || !name || !(STAFF_ROLES as readonly string[]).includes(role)) {
  console.error(`Usage: create-staff.ts <email> "<name>" <${STAFF_ROLES.join('|')}>`);
  process.exit(1);
}
const password = process.env['STAFF_PASSWORD'] ?? randomBytes(15).toString('base64url');
if (password.length < 12) { console.error('STAFF_PASSWORD must be at least 12 characters.'); process.exit(1); }
const existing = await prisma.user.findUnique({where: {email: email.toLowerCase()}});
if (existing && ifMissing) { console.log(`${email} already has an account; unchanged.`); await prisma.$disconnect(); process.exit(0); }
if (existing) { console.error('That email already has an account.'); process.exit(1); }
await prisma.user.create({data: {id: ulid(), email: email.toLowerCase(), name, role, passwordHash: await hashPassword(password)}});
console.log(`Created ${role} ${email}.${process.env['STAFF_PASSWORD'] ? '' : ` Temporary password (shown once): ${password}`}`);
await prisma.$disconnect();
