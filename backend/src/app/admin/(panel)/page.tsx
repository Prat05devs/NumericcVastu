import Link from 'next/link';
import {getDb} from '../../../lib/db.ts';
import {requireAdmin} from '../../../lib/auth.ts';
import {formatMoney} from '../../../lib/format.ts';
import {hasEncryptionKey} from '../../../lib/crypto.ts';
import Notice from '../../../components/Notice.tsx';

export default async function Overview({searchParams}: {searchParams: Promise<{notice?: string}>}) {
  const admin = await requireAdmin();
  const db = await getDb();
  const one = async (sql: string) => (await db.one<{n: number}>(sql))?.n ?? 0;
  const [coupons, live, scheduled, affiliates, clicks, orders, savings] = await Promise.all([
    one('select count(*) as n from coupons where active = 1 and (ends_at is null or ends_at > NOW(3))'),
    one('select count(*) as n from campaigns where active = 1 and starts_at <= NOW(3) and ends_at > NOW(3)'),
    one('select count(*) as n from campaigns where active = 1 and starts_at > NOW(3)'),
    one('select count(*) as n from affiliates where active'),
    one(`select count(*) as n from affiliate_clicks where created_at > NOW(3) - INTERVAL 30 DAY`),
    one(`select count(*) as n from redemptions where created_at > NOW(3) - INTERVAL 30 DAY`),
    one(`select coalesce(sum(discount), 0) as n from redemptions where currency = 'INR' and created_at > NOW(3) - INTERVAL 30 DAY`),
  ]);
  return <>
    <div className="topbar"><h1>Namaste, {admin.name.split(' ')[0]}</h1></div>
    <Notice params={await searchParams}/>
    {!hasEncryptionKey() && <p className="notice bad">Set SETTINGS_ENCRYPTION_KEY in the server environment before saving payment or AI keys. See backend/README.md.</p>}
    <div className="grid four" style={{marginBottom: 18}}>
      <Link className="stat" href="/admin/coupons"><b>{coupons}</b><span>active coupons</span></Link>
      <Link className="stat" href="/admin/campaigns"><b>{live}</b><span>sales running now · {scheduled} scheduled</span></Link>
      <Link className="stat" href="/admin/affiliates"><b>{affiliates}</b><span>active affiliates · {clicks} clicks in 30 days</span></Link>
      <div className="stat"><b>{orders}</b><span>discounted orders in 30 days · {formatMoney(savings, 'INR')} saved</span></div>
    </div>
    <div className="card">
      <h2>How this back office connects</h2>
      <p className="hint">numericcvaastu.com (consultations and courses) and numericcvaastucrystal.in (products) call this API for prices, coupons, sales and payment keys.</p>
      <ul>
        <li><b>Coupons</b> are codes customers type at checkout, or that an affiliate link applies for them.</li>
        <li><b>Affiliates</b> get private links (<code className="code">/r/…</code>) to share; visits and sales are credited to them.</li>
        <li><b>Sales &amp; festive offers</b> discount automatically for a period and decorate the websites (Diwali, Holi, New Year…).</li>
        <li><b>Payments</b> holds the Razorpay and PayPal test and live keys and the switch between them.</li>
      </ul>
    </div>
  </>;
}
