// Hostinger gives this app its environment variables at build time but not reliably at run time, so payment settings
// are fixed into the build. They are read only by server-only modules (lib/razorpay, lib/paypal, lib/notify, lib/bookings), which
// Next refuses to bundle for the browser.
const serverSettings=['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','RAZORPAY_INTERNATIONAL','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_ENV','BOOKING_NOTIFY_URL','SITE_BOOKINGS_SECRET','COMMERCE_API_URL'];

/** @type {import('next').NextConfig} */
const nextConfig={
  env:Object.fromEntries(serverSettings.filter((key)=>process.env[key]).map((key)=>[key,process.env[key]])),
  // Hostinger's servers cannot load sharp, so /_next/image fails there (503). The images in public/ are already sized
  // WebP files, so they are served as they are.
  images:{unoptimized:true},
  // The paid report's PDF route reads its fonts and cover images from disk; ship them with the server build.
  // The paid report's PDF routes read fonts and cover images from disk, and the PDF engine loads its own data files
  // (e.g. pdfkit's standard fonts) by computed paths that build tracing misses; ship all of them with the server build.
  outputFileTracingIncludes:Object.fromEntries(['/api/report/pdf'].map((route)=>[route,['./src/lib/report/fonts/**','./src/lib/report/assets/**','./node_modules/@react-pdf/**','./node_modules/pdfkit/**','./node_modules/fontkit/**','./node_modules/linebreak/**','./node_modules/unicode-properties/**','./node_modules/unicode-trie/**','./node_modules/brotli/**','./node_modules/hyphen/**','./node_modules/restructure/**','./node_modules/dfa/**','./node_modules/tiny-inflate/**','./node_modules/base64-js/**','./node_modules/png-js/**','./node_modules/jay-peg/**','./node_modules/yoga-layout/**','./node_modules/bidi-js/**','./node_modules/emoji-regex-xs/**','./node_modules/pako/**','./node_modules/fflate/**','./node_modules/@noble/ciphers/**','./node_modules/@noble/hashes/**']])),
  webpack(config,{dev}){if(!dev)config.cache=false;return config},
  // Browser security headers on every page: HTTPS only, no framing by other sites (clickjacking), no MIME sniffing,
  // no full URLs (which can carry report passes) sent to other sites, and no camera/microphone/location access.
  async headers(){return [
    {source:'/:path*',headers:[
      {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'},
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'SAMEORIGIN'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), interest-cohort=()'},
      {key:'Content-Security-Policy',value:"frame-ancestors 'self'; base-uri 'self'; object-src 'none'"},
    ]},
    // Personal pages and report links are never cached by the CDN or shared caches.
    {source:'/my-report/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'X-Robots-Tag',value:'noindex'}]},
    {source:'/checkout',headers:[{key:'X-Robots-Tag',value:'noindex'}]},
  ];},
  async redirects(){return [
    // Hostinger serves the bare domain directly; send it to the canonical www address.
    {source:'/:path*',has:[{type:'host',value:'numericcvaastu.com'}],destination:'https://www.numericcvaastu.com/:path*',permanent:true},
    {source:'/terms-and-condition',destination:'/terms-and-conditions',permanent:true},
    {source:'/pricing',destination:'/courses',permanent:true},
    // The Shop menu opens Adarshh's crystal store; keep any old /shop link working.
    {source:'/shop',destination:'https://numericcvaastucrystal.in/',permanent:false},
  ]},
};
export default nextConfig;
