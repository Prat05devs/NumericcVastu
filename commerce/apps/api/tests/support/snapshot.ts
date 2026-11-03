import {createConnection, type Connection} from 'mariadb';

/**
 * Proves demo scenarios leave nothing behind. Before: record every table's primary keys and checksum, plus the full
 * contents of the small configuration tables. After: delete every row whose key was not there before, restore the
 * configuration rows, and compare checksums table by table.
 */
const RESTORE_FULLY = ['site_settings', 'storefronts', 'secrets'];

async function connect(): Promise<Connection> {
  const u = new URL(process.env['DATABASE_URL']!);
  return createConnection({host: u.hostname, port: Number(u.port), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.slice(1), bigIntAsNumber: false, dateStrings: true, autoJsonMap: false});
}

export type Snapshot = {tables: string[]; keys: Map<string, {cols: string[]; set: Set<string>}>; checksums: Map<string, string>; rows: Map<string, Record<string, unknown>[]>};

export async function snapshot(): Promise<Snapshot> {
  const conn = await connect();
  try {
    const tables = (await conn.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations' ORDER BY TABLE_NAME`)).map((r: {t: string}) => r.t);
    const keys = new Map<string, {cols: string[]; set: Set<string>}>();
    for (const t of tables) {
      const cols = (await conn.query(`SELECT COLUMN_NAME AS c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION`, [t])).map((r: {c: string}) => r.c);
      const rows = await conn.query(`SELECT ${cols.map((c: string) => `\`${c}\``).join(',')} FROM \`${t}\``);
      keys.set(t, {cols, set: new Set(rows.map((r: Record<string, unknown>) => cols.map((c: string) => String(r[c])).join('|')))});
    }
    const checksums = new Map<string, string>();
    for (const r of await conn.query(`CHECKSUM TABLE ${tables.map((t: string) => `\`${t}\``).join(',')}`)) checksums.set(String(r.Table).split('.').pop()!, String(r.Checksum));
    const full = new Map<string, Record<string, unknown>[]>();
    for (const t of RESTORE_FULLY) full.set(t, await conn.query(`SELECT * FROM \`${t}\``));
    return {tables, keys, checksums, rows: full};
  } finally { await conn.end(); }
}

/** Deletes everything created since the snapshot and returns per-table deleted counts plus any checksum mismatches. */
export async function restore(s: Snapshot) {
  const conn = await connect();
  const deleted: Record<string, number> = {};
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of s.tables) {
      if (RESTORE_FULLY.includes(t)) continue;
      const {cols, set} = s.keys.get(t)!;
      const rows = await conn.query(`SELECT ${cols.map((c) => `\`${c}\``).join(',')} FROM \`${t}\``);
      const extra = rows.filter((r: Record<string, unknown>) => !set.has(cols.map((c) => String(r[c])).join('|')));
      for (const r of extra) await conn.query(`DELETE FROM \`${t}\` WHERE ${cols.map((c) => `\`${c}\` = ?`).join(' AND ')}`, cols.map((c) => r[c]));
      if (extra.length) deleted[t] = extra.length;
    }
    for (const t of RESTORE_FULLY) {
      const before = s.rows.get(t)!;
      const now = (await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``))[0].n;
      deleted[t] = Number(now) - before.length;
      await conn.query(`DELETE FROM \`${t}\``);
      for (const row of before) {
        const cols = Object.keys(row);
        await conn.query(`INSERT INTO \`${t}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => (row[c] !== null && typeof row[c] === 'object' && !(row[c] instanceof Date) ? JSON.stringify(row[c]) : row[c])));
      }
      if (!deleted[t]) delete deleted[t];
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    const mismatched: string[] = [];
    for (const r of await conn.query(`CHECKSUM TABLE ${s.tables.map((t) => `\`${t}\``).join(',')}`)) {
      const t = String(r.Table).split('.').pop()!;
      if (s.checksums.get(t) !== String(r.Checksum)) mismatched.push(t);
    }
    return {deleted, mismatched};
  } finally { await conn.end(); }
}
