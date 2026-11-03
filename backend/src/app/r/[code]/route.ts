import {getDb} from '../../../lib/db.ts';
import {findAffiliateLink} from '../../../lib/commerce.ts';
import {sha256} from '../../../lib/crypto.ts';

export const dynamic = 'force-dynamic';

/**
 * GET /r/<code> — the link an affiliate shares. Records the click and sends the visitor to the storefront page with
 * ?ref=<code>; the storefront keeps the code (for the attribution window set in the back office) and sends it with
 * quotes, so the affiliate's discount applies and the sale is credited to them. Unknown or disabled links still
 * reach the website, just without the offer.
 */
export async function GET(request: Request, {params}: {params: Promise<{code: string}>}) {
  const {code} = await params;
  const db = await getDb();
  const link = /^[A-Za-z0-9]{6,32}$/.test(code) ? await findAffiliateLink(code) : undefined;
  const storefront = await db.one<{base_url: string}>('select base_url from storefronts where id = ?', [link?.storefront_id ?? 'numericcvaastu']);
  const target = new URL(link?.target_path || '/', storefront?.base_url || 'https://www.numericcvaastu.com');
  if (link?.active && link.affiliate_active) {
    target.searchParams.set('ref', link.code);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const day = new Date().toISOString().slice(0, 10);
    await db.execute('insert into affiliate_clicks (link_id, referrer, user_agent, visitor_hash) values (?, ?, ?, ?)', [
      link.id, request.headers.get('referer')?.slice(0, 500) || null, request.headers.get('user-agent')?.slice(0, 300) || null, ip ? sha256(`${process.env.SETTINGS_ENCRYPTION_KEY ?? ''}:${day}:${ip}`) : null,
    ]);
  }
  return Response.redirect(target, 302);
}
