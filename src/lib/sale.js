import 'server-only';

/** Sale campaigns running on the website (back office → Sales & festive themes), refreshed every minute. */
const apiUrl = () => (process.env.COMMERCE_API_URL || 'https://api.numericcvaastu.com').replace(/\/+$/, '');
export async function getWebsiteSales() {
  try {
    const res = await fetch(`${apiUrl()}/api/v1/site/sale`, {next: {revalidate: 60, tags: ['website-sale']}, signal: AbortSignal.timeout(5000)});
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.data) ? body.data : [];
  } catch {
    return []; // the API being briefly unreachable never breaks a page: list prices show instead
  }
}
