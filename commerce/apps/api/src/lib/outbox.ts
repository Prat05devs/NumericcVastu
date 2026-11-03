import type {Tx} from './db.js';
import {ulid} from './ids.js';
import {toPlain} from './http.js';

/**
 * Durable side effects. Written in the same transaction as the state change; a finite cron run claims and executes
 * them. External effects may run more than once, so every handler is idempotent and dedupe keys stop duplicates.
 */
export async function enqueue(tx: Tx, type: string, payload: unknown, dedupeKey: string | null, runAfter = new Date()) {
  if (dedupeKey) {
    const exists = await tx.jobOutbox.findUnique({where: {dedupeKey}, select: {id: true}});
    if (exists) return;
  }
  await tx.jobOutbox.create({data: {id: ulid(), type, payloadJson: toPlain(payload) as object, dedupeKey, runAfter}});
}
