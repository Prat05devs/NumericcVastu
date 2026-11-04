import {z} from 'zod';

/**
 * Environment validation. The process refuses to start with a missing or malformed setting, and secrets never have
 * production defaults. Hostinger: set these in hPanel → the Node.js app → Environment variables.
 */
const bool = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1), // proxy hops in front of the API (Hostinger edge, the web /api proxy)
  DATABASE_URL: z.string().regex(/^mysql:\/\//, 'DATABASE_URL must be mysql://user:password@host:3306/db'),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(20).default(5),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, 'ENCRYPTION_KEY must be 32 bytes, base64'),
  CRON_JOB_SECRET: z.string().min(32),
  WEB_REVALIDATE_SECRET: z.string().min(16).optional(),
  // Shared with the main website, which reports course, consultation and report bookings to /internal/bookings.
  SITE_BOOKINGS_SECRET: z.string().min(32).optional(),
  // Payments: keys normally live encrypted in the back office; env values are a fallback for first setup.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  MOCK_PAYMENT_WEBHOOK_SECRET: z.string().min(16).default('mock-webhook-secret-for-local-tests'),
  ALLOW_LIVE_PAYMENTS: bool, // human approval gate: live mode stays locked unless this is "true"
  SHIPPING_WEBHOOK_SECRET: z.string().min(16).optional(),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('.storage'),
  OBJECT_STORAGE_ENDPOINT: z.string().url().optional(),
  OBJECT_STORAGE_REGION: z.string().default('auto'),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
  PUBLIC_MEDIA_BASE_URL: z.string().url().optional(),
  MAIL_DRIVER: z.enum(['log', 'smtp', 'disabled']).default('log'),
  SMTP_URL: z.string().optional(), // smtps://user:pass@smtp.hostinger.com:465
  MAIL_FROM: z.string().default('NumericcVaastu Crystal <orders@example.invalid>'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug']).default('info'),
  DEV_TOOLS: bool, // dev mailbox + mock payment simulator; refused in production
  LOAD_TEST_DISABLE_RATE_LIMITS: bool, // single-machine load tests only; refused in production
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && env.LOAD_TEST_DISABLE_RATE_LIMITS) ctx.addIssue({code: 'custom', message: 'LOAD_TEST_DISABLE_RATE_LIMITS must be false in production', path: ['LOAD_TEST_DISABLE_RATE_LIMITS']});
  if (env.NODE_ENV === 'production' && env.DEV_TOOLS) ctx.addIssue({code: 'custom', message: 'DEV_TOOLS must be false in production', path: ['DEV_TOOLS']});
  if (env.STORAGE_DRIVER === 's3' && !(env.OBJECT_STORAGE_ENDPOINT && env.OBJECT_STORAGE_BUCKET && env.OBJECT_STORAGE_ACCESS_KEY && env.OBJECT_STORAGE_SECRET_KEY)) {
    ctx.addIssue({code: 'custom', message: 'S3 storage needs OBJECT_STORAGE_ENDPOINT, _BUCKET, _ACCESS_KEY and _SECRET_KEY', path: ['STORAGE_DRIVER']});
  }
});
export type Env = z.infer<typeof Env>;

let cached: Env | null = null;
export function env(): Env {
  if (cached) return cached;
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment:\n  ${problems}`);
  }
  cached = parsed.data;
  return cached;
}
export const resetEnvForTests = () => { cached = null; };
