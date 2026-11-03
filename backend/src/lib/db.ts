import mysql from 'mysql2/promise';
import {migrations} from '../db/migrations.ts';

/**
 * MySQL 8.0+ / MariaDB 10.6+ through mysql2 (Hostinger cloud hosting provides MySQL/MariaDB).
 * DATABASE_URL=mysql://user:password@host:3306/database. Set DATABASE_SSL=true when the server requires TLS
 * (typical for remote connections).
 *
 * Queries are plain SQL with ? placeholders. Values are escaped by mysql2; pass Date objects for times, JSON.stringify
 * for JSON columns, and never objects or arrays (mysql2 would expand them).
 * Every connection works in UTC, booleans come back as true/false, and JSON columns come back parsed (MariaDB stores
 * JSON as text, so the known JSON columns are parsed here).
 */
export type Row = Record<string, any>;
export type WriteResult = {affectedRows: number};
export interface Db {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
  execute(sql: string, params?: unknown[]): Promise<WriteResult>;
  /** Runs `fn` on one connection inside a transaction. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  /** Runs `fn` on one connection without a transaction (session locks, migrations). */
  session<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const JSON_COLUMNS = new Set(['value', 'discount', 'theme', 'storefronts', 'allowed_origins', 'commission', 'details']);

function normalise(rows: unknown): Row[] {
  if (!Array.isArray(rows)) return [];
  for (const row of rows as Row[]) {
    for (const key of Object.keys(row)) if (JSON_COLUMNS.has(key) && typeof row[key] === 'string') row[key] = JSON.parse(row[key]);
  }
  return rows as Row[];
}

type Runner = {query: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>};

function wrap(runner: Runner, pool: mysql.Pool): Db {
  const db: Db = {
    query: async (sql, params = []) => normalise((await runner.query(sql, params))[0]) as any[],
    one: async (sql, params = []) => normalise((await runner.query(sql, params))[0])[0] as any,
    execute: async (sql, params = []) => ({affectedRows: ((await runner.query(sql, params))[0] as mysql.ResultSetHeader).affectedRows}),
    transaction: async (fn) => {
      if (runner !== (pool as unknown as Runner)) return fn(db);
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await fn(wrap(connection as unknown as Runner, pool));
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    session: async (fn) => {
      if (runner !== (pool as unknown as Runner)) return fn(db);
      const connection = await pool.getConnection();
      try { return await fn(wrap(connection as unknown as Runner, pool)); } finally { connection.release(); }
    },
    close: () => pool.end(),
  };
  return db;
}

export function createDb(url = process.env.DATABASE_URL || ''): Db {
  if (!/^mysql:\/\//.test(url)) {
    throw new Error('DATABASE_URL must be a MySQL connection string, e.g. mysql://user:password@localhost:3306/numericcvaastu (see backend/README.md).');
  }
  const pool = mysql.createPool({
    uri: url,
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE || 5),
    timezone: 'Z',
    charset: 'utf8mb4_unicode_ci',
    decimalNumbers: true,
    supportBigNumbers: true,
    enableKeepAlive: true,
    ...(process.env.DATABASE_SSL === 'true' && {ssl: {rejectUnauthorized: true}}),
    typeCast: (field, next) => {
      if (field.type === 'TINY' && field.length === 1) {
        const value = field.string();
        return value === null ? null : value === '1';
      }
      return next();
    },
  });
  // Store and compare times in UTC regardless of the server's own time zone.
  pool.on('connection', (connection: any) => { connection.query("SET time_zone = '+00:00'"); });
  return wrap(pool as unknown as Runner, pool);
}

/** Applies every migration not yet recorded. Safe to run repeatedly and from several processes at once. */
export async function migrate(db: Db): Promise<string[]> {
  return db.session(async (s) => {
    await s.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const lock = await s.one<{got: number}>("SELECT GET_LOCK('nv_migrations', 60) AS got");
    if (Number(lock?.got) !== 1) throw new Error('Another process is migrating the database; try again.');
    const applied: string[] = [];
    try {
      for (const migration of migrations) {
        if (await s.one('SELECT 1 FROM schema_migrations WHERE version = ?', [migration.version])) continue;
        for (const statement of migration.statements) await s.execute(statement);
        await s.execute('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]);
        applied.push(migration.version);
      }
    } finally {
      await s.query("SELECT RELEASE_LOCK('nv_migrations')");
    }
    return applied;
  });
}

const store = globalThis as unknown as {__nvDb?: Promise<Db>};

/** The shared, migrated database for this process. */
export function getDb(): Promise<Db> {
  store.__nvDb ??= (async () => {
    const db = createDb();
    await migrate(db);
    return db;
  })().catch((error) => {
    store.__nvDb = undefined;
    throw error;
  });
  return store.__nvDb;
}

/** True for MySQL's duplicate-key error (a unique column already holds the value). */
export const isDuplicate = (error: unknown) => (error as {code?: string})?.code === 'ER_DUP_ENTRY';
