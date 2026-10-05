const origin=process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com';
export default function robots(){return {rules:{userAgent:'*',allow:'/',disallow:['/loader-preview','/booking/','/enquiry/']},sitemap:`${origin}/sitemap.xml`}}
