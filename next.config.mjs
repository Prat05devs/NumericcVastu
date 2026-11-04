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
  outputFileTracingIncludes:{'/api/report/pdf':['./src/lib/report/fonts/**','./src/lib/report/assets/**']},
  webpack(config,{dev}){if(!dev)config.cache=false;return config},
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
