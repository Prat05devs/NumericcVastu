import {getDb} from './db.ts';

/** Records who changed what. Never pass a key, password or other secret in `details`. */
export async function audit(adminId: string | null, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}): Promise<void> {
  const db = await getDb();
  await db.execute('insert into audit_log (admin_id, action, entity, entity_id, details) values (?, ?, ?, ?, ?)', [adminId, action, entity, entityId, JSON.stringify(details)]);
}
