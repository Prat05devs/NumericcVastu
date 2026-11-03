/** @type {import('next').NextConfig} */
const nextConfig={
  webpack(config,{dev}){if(!dev)config.cache=false;return config},
  async redirects(){return [
    {source:'/terms-and-condition',destination:'/terms-and-conditions',permanent:true},
    {source:'/pricing',destination:'/courses',permanent:true},
    // The Shop menu opens Adarshh's crystal store; keep any old /shop link working.
    {source:'/shop',destination:'https://numericcvaastucrystal.in/',permanent:false},
  ]},
};
export default nextConfig;
