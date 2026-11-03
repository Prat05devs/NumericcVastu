/**
 * Hostinger entry file (its Express preset runs `server.js` in the root directory). BUILD_TARGET, set per app in
 * hPanel, picks the process: the commerce API or the web/back-office Next standalone server. Both are built by
 * scripts/hostinger-build.mjs (see docs/runbooks/hostinger-deployment.md).
 */
const {join} = require('node:path');
const {pathToFileURL} = require('node:url');

const entries = {
  api: 'apps/api/dist/server.js',
  web: 'apps/web/.next/standalone/apps/web/server.js',
};
const target = process.env.BUILD_TARGET;
if (!entries[target]) {
  console.error(`Set BUILD_TARGET to "api" or "web" (got "${target ?? ''}").`);
  process.exit(1);
}
// Next's standalone server binds to HOSTNAME, which Linux shells often set to the machine name.
if (target === 'web') process.env.HOSTNAME = '0.0.0.0';
import(pathToFileURL(join(__dirname, entries[target])).href).catch((error) => {
  console.error(error);
  process.exit(1);
});
