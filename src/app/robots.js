import {siteUrl} from '../lib/site';

const disallow=['/loader-preview','/booking/','/enquiry/','/api/'];

/**
 * AI search and answer engines are named explicitly so they can read and cite the site: ChatGPT (OpenAI),
 * Claude (Anthropic), Perplexity, Gemini (Google-Extended), Apple, Microsoft Copilot (Bingbot), DuckDuckGo, Meta,
 * Amazon, Mistral, Cohere and Common Crawl, whose open dataset feeds many models such as DeepSeek and Kimi.
 * A crawler that matches a named group ignores the * group, so each group repeats the same rules.
 */
const aiCrawlers=['GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-SearchBot','Claude-User','anthropic-ai','PerplexityBot','Perplexity-User','Google-Extended','Applebot','Applebot-Extended','Bingbot','DuckAssistBot','Meta-ExternalAgent','Amazonbot','MistralAI-User','cohere-ai','CCBot'];

export default function robots(){return {rules:[{userAgent:'*',allow:'/',disallow},{userAgent:aiCrawlers,allow:'/',disallow}],sitemap:`${siteUrl}/sitemap.xml`,host:siteUrl}}
