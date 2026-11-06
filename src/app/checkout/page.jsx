
import LocalizedContent from '../../i18n/LocalizedContent';
import Link from 'next/link';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {Check, Clock, ShieldCheck} from 'lucide-react';
import {SiteFooter} from '../../components/SiteChrome';
import CheckoutFlow from '../../components/CheckoutFlow';
import {offerCatalog, formatPrice, getPrice} from '../../data/offers';
import {getWebsiteSales} from '../../lib/sale';
import {bestSale, money} from '../../lib/saleMath';
import {intakeFor, sessionFields} from '../../data/intake';
import {contact} from '../../data/contact';
import {onlinePayment} from '../../lib/razorpay';
import {paypalPayment} from '../../lib/paypal';
import {requestCurrency} from '../../lib/currency';

export const metadata = {title: 'Checkout | NumericcVaastu', robots: {index: false, follow: false}};

export default async function Page({searchParams}) {
  const {offer: id} = await searchParams;
  const found = offerCatalog.offers.find((o) => o.id === id && o.active);
  if (!found) notFound();
  // Rupees in India, dollars elsewhere; decided on the server so the amount shown is the amount charged.
  const currency = requestCurrency(await headers());
  // A running sale is shown here exactly as it will be charged (same arithmetic as the payment route).
  const sale = bestSale(await getWebsiteSales(), found, getPrice(found, currency), currency);
  const offer = {id: found.id, kind: found.kind, name: found.name, summary: found.summary, priceLabel: sale ? money(sale.finalMinor, currency) : formatPrice(found, undefined, currency), listPriceLabel: formatPrice(found, undefined, currency), sale: sale ? {name: sale.sale.name, discountLabel: money(sale.discountMinor, currency)} : null, inclusions: found.inclusions, href: `/${found.kind === 'course' ? 'courses' : 'consultations'}/${found.slug}`};
  const payment = {currency, razorpay: onlinePayment(found, currency), paypal: currency === 'USD' ? paypalPayment(found) : null};
  return <LocalizedContent><>
    <main id="main" className="hv co-page">
      <div className="hv-wrap co-layout">
        <div>
          <p className="co-crumb"><Link href={offer.href}>{offer.kind === 'course' ? 'Course' : 'Consultation'}</Link> / Checkout</p>
          <CheckoutFlow offer={offer} intake={intakeFor(found)} sessionFields={sessionFields(found.id)} payment={payment} whatsapp={contact.whatsapp} termsHref={{terms: '/terms-and-conditions', refund: '/refund-policy', disclaimer: '/disclaimer'}}/>
        </div>
        <aside className="co-summary" aria-label="Order summary">
          <span className="hv-eyebrow">{offer.kind === 'course' ? 'Your course' : 'Your consultation'}</span>
          <h2>{offer.name}</h2>
          <p>{offer.summary}</p>
          <ul>{offer.inclusions.slice(0, 5).map((i) => <li key={i}><Check size={16}/>{i}</li>)}</ul>
          {offer.sale && <div className="co-summary__sale"><span>{offer.sale.name}</span><span><s>{offer.listPriceLabel}</s> −{offer.sale.discountLabel}</span></div>}
          <div className="co-summary__total"><span>Amount payable</span><strong>{offer.priceLabel}</strong></div>
          <p className="co-summary__fine">{found.priceVerified ? 'Fee confirmed by NumericcVaastu.' : offerCatalog.priceNote}</p>
          <ul className="co-summary__next">
            <li><Clock size={16}/>{offer.kind === 'course' ? 'The team shares batch dates and access.' : 'The team confirms your slot on WhatsApp.'}</li>
            <li><ShieldCheck size={16}/>Your details are shared only with Adarshh and his team.</li>
          </ul>
        </aside>
      </div>
    </main>
    <SiteFooter/>
  </></LocalizedContent>;
}
