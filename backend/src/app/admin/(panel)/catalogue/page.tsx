import {can, requireAdmin} from '../../../../lib/auth.ts';
import {catalogue} from '../../../../lib/commerce.ts';
import {formatMoney} from '../../../../lib/format.ts';

export default async function Catalogue() {
  await requireAdmin(can.catalogue);
  const items = await catalogue();
  return <>
    <div className="topbar"><h1>Catalogue</h1></div>
    <p className="notice warn">Product management (adding crystals, rudraksha, gemstones, yantras and editing prices here) comes with the e-commerce design. For now consultations and courses mirror the website's price list; run <code className="code">npm run db:sync-website</code> after changing prices in src/data/offers.ts.</p>
    <div className="card"><table>
      <thead><tr><th>Item</th><th>Kind</th><th>Website</th><th>India</th><th>Abroad</th><th>ID</th></tr></thead>
      <tbody>{items.map((i) => <tr key={i.id}><td>{i.name}{!i.active && <span className="chip muted"> off</span>}</td><td>{i.kind}</td><td>{i.storefront}</td><td>{formatMoney(i.priceInr, 'INR')}</td><td>{formatMoney(i.priceUsd, 'USD')}</td><td><code>{i.id}</code></td></tr>)}</tbody>
    </table></div>
  </>;
}
