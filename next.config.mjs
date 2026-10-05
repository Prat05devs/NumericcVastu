/** @type {import('next').NextConfig} */
const nextConfig={
  webpack(config,{dev}){if(!dev)config.cache=false;return config},
  async redirects(){return [{source:'/terms-and-condition',destination:'/terms-and-conditions',permanent:true},{source:'/pricing',destination:'/courses',permanent:true}]},
};
export default nextConfig;
