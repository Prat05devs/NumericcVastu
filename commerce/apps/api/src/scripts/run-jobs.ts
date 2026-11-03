/** Hostinger Cron entry point: `node dist/scripts/run-jobs.js [job ...]` — runs once, prints a JSON summary, exits. */
import {prisma} from '../lib/db.js';
import {jsonReplacer} from '../lib/http.js';
import {runJobs, JOBS, type JobName} from '../services/jobs.js';

const requested = process.argv.slice(2).filter((a): a is JobName => a in JOBS);
runJobs(requested.length ? requested : undefined)
  .then((result) => { console.log(JSON.stringify({at: new Date().toISOString(), result}, jsonReplacer)); })
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
