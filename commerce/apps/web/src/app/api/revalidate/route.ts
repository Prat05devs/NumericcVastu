import {revalidatePath, revalidateTag} from 'next/cache';
import {timingSafeEqual} from 'node:crypto';

/** Called by the API's outbox (web.revalidate job) after staff publish changes. Bearer WEB_REVALIDATE_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.WEB_REVALIDATE_SECRET ?? '';
  const auth = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || auth.length !== expected.length || !timingSafeEqual(auth, expected)) return Response.json({error: 'unauthorized'}, {status: 401});
  const body = (await req.json().catch(() => ({}))) as {tags?: string[]; paths?: string[]};
  for (const tag of (body.tags ?? []).slice(0, 20)) revalidateTag(tag, 'max');
  for (const path of (body.paths ?? []).slice(0, 50)) if (path.startsWith('/')) revalidatePath(path);
  return Response.json({revalidated: true});
}
