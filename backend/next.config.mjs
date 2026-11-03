import {fileURLToPath} from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The backend is its own app inside the website's repository; trace files from this folder only.
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  poweredByHeader: false,
  async headers() {
    return [{source: '/admin/:path*', headers: [
      {key: 'X-Frame-Options', value: 'DENY'},
      {key: 'Referrer-Policy', value: 'same-origin'},
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'X-Robots-Tag', value: 'noindex, nofollow'},
    ]}];
  },
};
export default nextConfig;
