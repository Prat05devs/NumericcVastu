import './env.ts';
import {createDb, migrate} from '../src/lib/db.ts';
import {offerCatalog} from '../../src/data/offers.ts';

/**
 * npm run db:sync-website: copies consultations and courses (names, URLs, INR and USD prices, active flag) from the
 * website's catalogue, src/data/offers.ts, into the back office. Run it after changing prices there, until product
 * management moves into the dashboard.
 */
const db = createDb();
await migrate(db);
for (const offer of offerCatalog.offers) {
  await db.execute(
    `INSERT INTO catalogue_items (id, storefront_id, kind, name, url, price_inr, price_usd, active) VALUES (?, 'numericcvaastu', ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE kind = VALUES(kind), name = VALUES(name), url = VALUES(url), price_inr = VALUES(price_inr), price_usd = VALUES(price_usd), active = VALUES(active)`,
    [offer.id, offer.kind, offer.name, `/${offer.kind === 'course' ? 'courses' : 'consultations'}/${offer.slug}`, offer.pricePaise, offer.priceUsdCents, offer.active],
  );
}
console.log(`Synced ${offerCatalog.offers.length} items from src/data/offers.ts.`);
await db.close();
