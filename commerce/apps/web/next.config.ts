import type {NextConfig} from 'next';

/**
 * The web app never talks to MySQL. Browser calls to /api/v1/* are proxied to the commerce API so cookies stay
 * first-party (same origin) and CSRF/Origin checks work; server components call the API directly (API_INTERNAL_URL).
 */
const api = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@sc/contracts'],
  async rewrites() {
    return [{source: '/api/v1/:path*', destination: `${api}/api/v1/:path*`}];
  },
  async headers() {
    const security = [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
      {key: 'X-Frame-Options', value: 'DENY'},
    ];
    return [
      {source: '/:path*', headers: security},
      // Never cache personal or back-office pages at the CDN.
      {source: '/(account|admin|partner|checkout|cart|orders)/:path*', headers: [{key: 'Cache-Control', value: 'private, no-store'}, {key: 'X-Robots-Tag', value: 'noindex'}]},
    ];
  },
};
export default nextConfig;
