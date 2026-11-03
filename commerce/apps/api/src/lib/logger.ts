import pino from 'pino';
import {env} from '../config/env.js';

/** Structured JSON logs. Credentials, tokens, contact details, birth data and provider payloads are redacted. */
export const logger = pino({
  level: env().NODE_ENV === 'test' ? 'silent' : env().LOG_LEVEL,
  redact: {paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-razorpay-signature"]', '*.password', '*.keySecret', '*.webhookSecret', '*.apiKey', '*.email', '*.phone', '*.dateOfBirth', '*.code', '*.token', 'payload'], censor: '[redacted]'},
  base: {service: 'commerce-api'},
});
