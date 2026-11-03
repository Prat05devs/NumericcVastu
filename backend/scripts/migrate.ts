import './env.ts';
import {createDb, migrate} from '../src/lib/db.ts';

/** npm run db:migrate: applies pending migrations (the app also does this on first use). */
const db = createDb();
const applied = await migrate(db);
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
await db.close();
