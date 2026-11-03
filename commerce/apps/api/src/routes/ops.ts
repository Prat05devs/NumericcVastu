import {Router} from 'express';
import {z} from 'zod';
import {env} from '../config/env.js';
import {AppError} from '../lib/errors.js';
import {safeEqual} from '../lib/crypto.js';
import {parse, route, send, toPlain, noStore} from '../lib/http.js';
import {clearDevMailbox, devMailbox} from '../lib/mail.js';
import {mockCharge} from '../providers/payments/index.js';
import {handlePaymentWebhook, mockToolsEnabled} from '../services/payments.js';
import {runJobs, JOBS, type JobName} from '../services/jobs.js';

export const opsRouter = Router();
const r = opsRouter;

/** Cron alternative to the CLI: Bearer CRON_JOB_SECRET; same finite, leased jobs. */
route(r, {method: 'post', path: '/internal/jobs/run', access: 'CRON', tag: 'Operations', summary: 'Run scheduled jobs (Bearer secret)', body: z.object({jobs: z.array(z.string()).optional()})}, async (req, res) => {
  noStore(res);
  const auth = req.get('Authorization') ?? '';
  if (!safeEqual(auth, `Bearer ${env().CRON_JOB_SECRET}`)) throw new AppError('UNAUTHENTICATED', 401, 'Unauthorized.');
  const {jobs} = parse(z.object({jobs: z.array(z.enum(Object.keys(JOBS) as [JobName, ...JobName[]])).optional()}), req.body);
  send(res, toPlain(await runJobs(jobs)));
});

// ───────────── Development tools: refused unless DEV_TOOLS=true (never in production) or under tests.
function devOnly() {
  if (!mockToolsEnabled()) throw new AppError('NOT_FOUND', 404, 'Not found.');
}
route(r, {method: 'get', path: '/dev/mailbox', access: 'DEV', tag: 'Development', summary: 'Messages captured by the log mail driver'}, (_req, res) => { devOnly(); noStore(res); send(res, devMailbox()); });
route(r, {method: 'delete', path: '/dev/mailbox', access: 'DEV', tag: 'Development', summary: 'Clear the dev mailbox'}, (_req, res) => { devOnly(); clearDevMailbox(); send(res, {cleared: true}); });
const MockPay = z.object({providerOrderId: z.string().startsWith('mock_order_'), outcome: z.enum(['success', 'failure']), amountPaise: z.string().regex(/^\d+$/).optional(), deliverWebhook: z.boolean().default(true)});
route(r, {method: 'post', path: '/dev/mock-pay', access: 'DEV', tag: 'Development', summary: 'Simulate the customer paying at the mock provider (optionally losing the webhook)', body: MockPay}, async (req, res) => {
  devOnly();
  const b = parse(MockPay, req.body);
  const charge = await mockCharge(b.providerOrderId, b.outcome, b.amountPaise ? BigInt(b.amountPaise) : undefined);
  const webhook = b.deliverWebhook ? await handlePaymentWebhook('mock', charge.body, {'x-razorpay-signature': charge.signature, 'x-razorpay-event-id': charge.eventId}) : null;
  send(res, {payment: charge.payment, webhook, signedEvent: {eventId: charge.eventId, signature: charge.signature, body: charge.body.toString('utf8')}});
});
