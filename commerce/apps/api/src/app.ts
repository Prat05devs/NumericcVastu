import express from 'express';
import helmet from 'helmet';
import {env} from './config/env.js';
import {jsonReplacer} from './lib/http.js';
import {cors, csrf, requestContext} from './middleware/core.js';
import {loadAuth} from './middleware/auth.js';
import {errorHandler, notFoundHandler} from './middleware/errors.js';
import {publicRouter} from './routes/public.js';
import {staffAuthRouter} from './routes/staff-auth.js';
import {adminCatalogueRouter} from './routes/admin-catalogue.js';
import {adminOrdersRouter} from './routes/admin-orders.js';
import {adminMarketingRouter} from './routes/admin-marketing.js';
import {adminSettingsRouter} from './routes/admin-settings.js';
import {partnerRouter} from './routes/partner.js';
import {opsRouter} from './routes/ops.js';
import {siteBookingsRouter} from './routes/site-bookings.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env().TRUST_PROXY); // real client IP for rate limits behind Hostinger / the web proxy
  app.set('json replacer', jsonReplacer);
  app.use(helmet({contentSecurityPolicy: {directives: {defaultSrc: ["'none'"], frameAncestors: ["'none'"]}}, crossOriginResourcePolicy: {policy: 'cross-origin'}, hsts: env().NODE_ENV === 'production'}));
  app.use(requestContext);
  app.use(cors);

  const v1 = express.Router();
  // Webhooks need the raw bytes for HMAC verification: they are mounted before the JSON parser and never use cookies.
  v1.use((req, res, next) => (req.path.startsWith('/webhooks/') ? next() : express.json({limit: '100kb'})(req, res, next)));
  v1.use((req, res, next) => (req.path.startsWith('/webhooks/') || req.path.startsWith('/internal/') ? next() : csrf(req, res, next)));
  v1.use(loadAuth);
  v1.use(publicRouter);
  v1.use(staffAuthRouter);
  v1.use(partnerRouter);
  v1.use('/admin', adminCatalogueRouter, adminOrdersRouter, adminMarketingRouter, adminSettingsRouter);
  v1.use(opsRouter);
  v1.use(siteBookingsRouter);
  app.use('/api/v1', v1);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
