import type {Tx} from './db.js';
import {prisma} from './db.js';
import {ulid} from './ids.js';
import {sha256, toPlainSafe} from './redact.js';

export type AuditCtx = {actorId: string | null; ip?: string | undefined; requestId?: string | undefined};

/** Append-only audit trail. Values are redacted before they are stored (no secrets, contact details or birth data). */
export async function audit(db: Tx | typeof prisma, ctx: AuditCtx, action: string, entityType: string, entityId: string | null, changes: unknown = {}) {
  await db.auditLog.create({data: {
    id: ulid(), actorId: ctx.actorId, action, entityType, entityId, changesRedactedJson: toPlainSafe(changes) as object,
    ipHash: ctx.ip ? sha256(ctx.ip).slice(0, 64) : null, requestId: ctx.requestId ?? null,
  }});
}
