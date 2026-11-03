import {getDb} from '../../../lib/db.ts';

export const dynamic = 'force-dynamic';

/** Uptime check: the API is running and the database answers. */
export async function GET() {
  try {
    await (await getDb()).one('select 1');
    return Response.json({ok: true});
  } catch {
    return Response.json({ok: false}, {status: 503});
  }
}
