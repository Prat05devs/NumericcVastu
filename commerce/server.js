/**
 * Hostinger entry file (its Express preset runs `server.js` in the root directory). BUILD_TARGET, set per app in
 * hPanel, picks the process: the commerce API, or the web/back office served by Next from apps/web in place (the
 * same installed node_modules the build used). Both are built by scripts/hostinger-build.mjs
 * (docs/runbooks/hostinger-deployment.md).
 */
const http = require('node:http');
const {join} = require('node:path');
const {pathToFileURL} = require('node:url');

const target = process.env.BUILD_TARGET;
if (target === 'api') {
  import(pathToFileURL(join(__dirname, 'apps/api/dist/server.js')).href).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (target === 'web') {
  startWeb().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  console.error(`Set BUILD_TARGET to "api" or "web" (got "${target ?? ''}").`);
  process.exit(1);
}

async function startWeb() {
  const dir = join(__dirname, 'apps/web');
  const port = Number(process.env.PORT) || 3000;
  logCrashes();
  const next = require(require.resolve('next', {paths: [dir]}));
  const app = next({dir, dev: false, hostname: '0.0.0.0', port});
  await app.prepare();
  const handle = app.getRequestHandler();
  http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error('request failed', req.url, error);
      if (!res.headersSent) { res.statusCode = 500; res.end('Internal Server Error'); }
    });
  }).listen(port, '0.0.0.0', () => console.log(`web listening on ${port}`));
}

/** Unexpected errors are written to the process log instead of silently killing the server. */
function logCrashes() {
  process.on('uncaughtException', (error) => console.error('uncaught', error));
  process.on('unhandledRejection', (error) => console.error('unhandled rejection', error));
}
