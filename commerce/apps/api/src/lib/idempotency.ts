import type {Request} from 'express';
import {prisma, type Tx} from './db.js';
import {AppError} from './errors.js';
import {ulid} from './ids.js';
import {sha256} from './redact.js';
import {jsonReplacer, toPlain} from './http.js';
import {isUniqueViolation} from './tx.js';

const RETENTION_HOURS = 48;
const ABANDONED_MS = 120_000;

export type IdemResult = {status: number; body: unknown};
export type IdemHandle = {id: string; complete: (tx: Tx, result: IdemResult) => Promise<void>};

/**
 * Idempotency-Key handling. The key row is created first (IN_PROGRESS); the handler completes it inside its own
 * business transaction so the stored response and the state change commit together. A replay with the same key and
 * body returns the stored response; a different body is rejected; a concurrent duplicate gets 409.
 */
export async function idempotent(req: Request, scope: string, actorRef: string, handler: (h: IdemHandle) => Promise<IdemResult>): Promise<IdemResult> {
  const key = req.get('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 200) throw new AppError('VALIDATION_FAILED', 422, 'An Idempotency-Key header (8–200 characters) is required.');
  const keyHash = sha256(key);
  const requestHash = sha256(`${req.method} ${req.baseUrl}${req.path}\n${JSON.stringify(req.body ?? {}, jsonReplacer)}`);

  let id = ulid();
  try {
    await prisma.idempotencyKey.create({data: {id, scope, actorRef, keyHash, requestHash, expiresAt: new Date(Date.now() + RETENTION_HOURS * 3600_000)}});
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await prisma.idempotencyKey.findUnique({where: {scope_actorRef_keyHash: {scope, actorRef, keyHash}}});
    if (!existing) throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409, 'This request is already being processed.');
    if (existing.requestHash !== requestHash) throw new AppError('IDEMPOTENCY_KEY_REUSED', 422, 'This Idempotency-Key was used for a different request.');
    if (existing.status === 'COMPLETED') return {status: existing.responseCode ?? 200, body: existing.responseJson};
    if (Date.now() - existing.createdAt.getTime() < ABANDONED_MS) throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409, 'This request is already being processed.');
    // Abandoned attempt (its transaction never committed): take it over with a guarded claim.
    const claimed = await prisma.idempotencyKey.updateMany({where: {id: existing.id, status: 'IN_PROGRESS', createdAt: existing.createdAt}, data: {createdAt: new Date()}});
    if (claimed.count !== 1) throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409, 'This request is already being processed.');
    id = existing.id;
  }

  let completed = false;
  const handle: IdemHandle = {
    id,
    complete: async (tx, result) => {
      await tx.idempotencyKey.update({where: {id}, data: {status: 'COMPLETED', responseCode: result.status, responseJson: toPlain(result.body) as object}});
      completed = true;
    },
  };
  try {
    const result = await handler(handle);
    if (!completed) await prisma.idempotencyKey.update({where: {id}, data: {status: 'COMPLETED', responseCode: result.status, responseJson: toPlain(result.body) as object}});
    return result;
  } catch (error) {
    // Nothing committed under this key: release it so the client can retry with the same key.
    if (!completed) await prisma.idempotencyKey.deleteMany({where: {id, status: 'IN_PROGRESS'}}).catch(() => undefined);
    throw error;
  }
}
