import {prisma} from './db.js';
import {decrypt, encrypt} from './crypto.js';

/** Encrypted credentials managed from the back office. Values are never returned to clients, only "set" + last 4. */
export async function getSecret(name: string): Promise<string | null> {
  const row = await prisma.secret.findUnique({where: {name}});
  if (!row) return null;
  try { return decrypt(row.ciphertext); } catch { return null; }
}
export async function setSecret(name: string, value: string, actorId: string | null) {
  const ciphertext = encrypt(value);
  const last4 = value.slice(-4);
  await prisma.secret.upsert({where: {name}, create: {name, ciphertext, last4, updatedBy: actorId}, update: {ciphertext, last4, updatedBy: actorId}});
}
export async function deleteSecret(name: string) {
  await prisma.secret.deleteMany({where: {name}});
}
export async function secretSummary(prefix: string) {
  const rows = await prisma.secret.findMany({where: {name: {startsWith: prefix}}, select: {name: true, last4: true, updatedAt: true}});
  return Object.fromEntries(rows.map((r) => [r.name, {set: true, last4: r.last4, updatedAt: r.updatedAt}]));
}
