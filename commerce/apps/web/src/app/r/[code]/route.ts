import {NextResponse, type NextRequest} from 'next/server';

/**
 * Partner link: /r/<code>. The API records the click and returns a signed attribution token, stored here as a
 * first-party httpOnly cookie for the partner's attribution window (last click wins). Unknown or paused links simply
 * go to the home page. The cookie value is useless if forged: checkout verifies its signature server-side.
 */
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

export async function GET(req: NextRequest, ctx: {params: Promise<{code: string}>}) {
  const {code} = await ctx.params;
  const home = new URL('/', req.url);
  if (!/^[A-Za-z0-9]{6,32}$/.test(code)) return NextResponse.redirect(home);
  try {
    const res = await fetch(`${API}/api/v1/r/${code}`, {cache: 'no-store', headers: {'X-Visitor-User-Agent': req.headers.get('user-agent') ?? '', 'X-Visitor-Referrer': req.headers.get('referer') ?? '', 'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? ''}});
    if (!res.ok) return NextResponse.redirect(home);
    const {data} = (await res.json()) as {data: {token: string; maxAgeDays: number; targetPath: string; couponCode: string | null}};
    const target = new URL(data.targetPath.startsWith('/') && !data.targetPath.startsWith('//') ? data.targetPath : '/', req.url);
    if (data.couponCode) target.searchParams.set('code', data.couponCode);
    const out = NextResponse.redirect(target);
    out.cookies.set('sc_ref', data.token, {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: data.maxAgeDays * 86_400});
    out.headers.set('Cache-Control', 'no-store');
    out.headers.set('X-Robots-Tag', 'noindex');
    return out;
  } catch {
    return NextResponse.redirect(home);
  }
}
