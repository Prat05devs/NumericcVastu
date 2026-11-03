import {storefrontConfig} from '../../../../../lib/commerce.ts';
import {json, knownStorefront, preflight} from '../../../../../lib/http.ts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/storefront/config?storefront=numericcvaastu|crystal
 * The running sale (with its banner, colours and decoration) and the public payment keys for the current mode.
 */
export async function GET(request: Request) {
  const storefront = new URL(request.url).searchParams.get('storefront');
  if (!(await knownStorefront(storefront))) return json(request, {error: 'Unknown storefront.'}, 400);
  return json(request, await storefrontConfig(storefront!));
}

export const OPTIONS = preflight;
