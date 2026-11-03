import {prisma, type Tx} from './db.js';

/** Short transaction with READ COMMITTED and a bounded retry on deadlock / lock-wait timeout. */
export async function transaction<T>(fn: (tx: Tx) => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await prisma.$transaction(fn, {isolationLevel: 'ReadCommitted', maxWait: 5_000, timeout: 15_000});
    } catch (error) {
      if (i >= attempts || !isRetryable(error)) throw error;
      await new Promise((r) => setTimeout(r, 15 * i + Math.random() * 25));
    }
  }
}

function isRetryable(error: unknown): boolean {
  const e = error as {code?: string; message?: string; meta?: {code?: string}};
  const text = `${e?.code ?? ''} ${e?.meta?.code ?? ''} ${e?.message ?? ''}`;
  return /P2034|1213|1205|deadlock|lock wait timeout/i.test(text);
}

export const isUniqueViolation = (error: unknown) => {
  const e = error as {code?: string; message?: string};
  return e?.code === 'P2002' || /1062|Duplicate entry|Unique constraint/i.test(e?.message ?? '');
};

/** Rows changed by a guarded raw UPDATE. */
export const affected = (n: number | bigint) => Number(n);
