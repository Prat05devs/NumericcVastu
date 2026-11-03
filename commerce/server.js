/**
 * Hostinger entry file (its Express preset runs `server.js` in the root directory). BUILD_TARGET, set per app in
 * hPanel, picks the process: the commerce API, or the web/back office served by Next from apps/web in place (the
 * same installed node_modules the build used). Both are built by scripts/hostinger-build.mjs
 * (docs/runbooks/hostinger-deployment.md).
 */
const http = require('node:http');
const {existsSync} = require('node:fs');
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
  const recent = keepRecentErrors();
  const next = require(require.resolve('next', {paths: [dir]}));
  const app = next({dir, dev: false, hostname: '0.0.0.0', port});
  await app.prepare();
  const handle = app.getRequestHandler();
  http.createServer((req, res) => {
    // Temporary diagnostics while Hostinger's runtime log viewer is unavailable: /__diag?key=<WEB_REVALIDATE_SECRET>.
    if (req.url.startsWith('/__diag')) return diagnostics(req, res, dir, recent);
    handle(req, res).catch((error) => {
      console.error('request failed', req.url, error);
      if (!res.headersSent) { res.statusCode = 500; res.end('Internal Server Error'); }
    });
  }).listen(port, '0.0.0.0', () => console.log(`web listening on ${port}`));
}

function keepRecentErrors() {
  const lines = [];
  for (const level of ['error', 'warn']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      lines.push(`${new Date().toISOString()} ${level} ${args.map((a) => (a instanceof Error ? a.stack : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`.slice(0, 4000));
      if (lines.length > 100) lines.shift();
      original(...args);
    };
  }
  process.on('uncaughtException', (error) => console.error('uncaught', error));
  process.on('unhandledRejection', (error) => console.error('unhandled rejection', error));
  return lines;
}

function diagnostics(req, res, dir, recent) {
  const key = new URL(req.url, 'http://x').searchParams.get('key');
  if (!process.env.WEB_REVALIDATE_SECRET || key !== process.env.WEB_REVALIDATE_SECRET) { res.statusCode = 404; return res.end('Not found'); }
  const files = ['.next/BUILD_ID', '.next/server/app/robots.txt.body', '.next/server/app/admin.html', '.next/static', 'node_modules/next/package.json', 'node_modules/react/package.json'];
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end([
    `node ${process.version} cwd ${process.cwd()} dir ${dir}`,
    `env: API_INTERNAL_URL=${process.env.API_INTERNAL_URL ? 'set' : 'missing'} NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL ? 'set' : 'missing'} PORT=${process.env.PORT ?? ''}`,
    ...files.map((f) => `${existsSync(join(dir, f)) ? 'ok     ' : 'MISSING'} ${f}`),
    '--- recent errors ---',
    ...recent,
  ].join('\n'));
}
